<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img src="./assets/logo-light.png" alt="Polkadot Stack Template" width="220" />
  </picture>
</p>

# Encrypted Posts

End-to-end encryption for `Obfuscated` and `Private` posts in
`pallet-social-feeds`. Public posts are unchanged. The ciphertext lives
on IPFS, the symmetric content key is sealed to a custodial collator
X25519 public key, and the collator's offchain worker re-seals the key
to the viewer's ephemeral public key once they pay `unlock_fee`.

**Trust model (MVP)**: a single custodial collator. Whoever runs that
collator can decrypt the whole catalogue. Acceptable for a hackathon
demo; migratable to a threshold committee or TEE later without touching
the pallet's public API.

---

## 1. Architecture at a glance

```
┌──────────┐                                  ┌──────────────┐
│  Author  │  create_post(cid, capsule, ...)  │   Chain      │
│ (browser)│ ───────────────────────────────► │  on-chain    │
│          │                                  │              │
│ encrypt  │      uploadRaw(ciphertext)       │              │
│  with    │ ──────► IPFS gateway ──────────► │              │
│k_content │                                  │              │
└──────────┘                                  └──────┬───────┘
                                                     │
┌──────────┐                                         │
│  Viewer  │  unlock_post(post_id, buyer_pk)         │
│ (browser)│ ────────────────────────────────────────▼
│          │                                  ┌──────────────┐
│ gen kp   │                                  │ Unlocks map  │
│ sk/pk    │                                  │   pending    │
└────┬─────┘                                  └──────┬───────┘
     │                                               │
     │  (after 1-2 blocks)                           │
     │                                               ▼
     │                                  ┌─────────────────────┐
     │                                  │ Collator OCW        │
     │                                  │  - open capsule     │
     │                                  │  - reseal to pk_b   │
     │                                  │  - submit unsigned  │
     │                                  └──────────┬──────────┘
     │                                             │
     │         wrapped_key visible on-chain        │
     │ ◄───────────────────────────────────────────┘
     │
     │  unseal + decrypt IPFS blob
     ▼
  plaintext
```

---

## 2. Cryptography choices

| Primitive | Algorithm | Rust crate | JS crate |
|-----------|-----------|------------|----------|
| Symmetric AEAD | XChaCha20-Poly1305 | `chacha20poly1305` | `libsodium-wrappers` |
| Asymmetric seal | libsodium sealed box over X25519 | `crypto_box` (`seal` feature) | `libsodium-wrappers` |
| Content key | 32 random bytes | `sodium.randombytes_buf` | same |
| Signed payload | sr25519 | Substrate native | — (signed on the collator only) |

**Sealed box size**: 32 (ephemeral pk) + 32 (ciphertext) + 16 (MAC) =
**80 bytes** for a 32-byte content key. This is the exact on-chain
bound for both `capsule` and `wrapped_key`.

**Interop**: the Rust `crypto_box::seal` output is byte-for-byte
compatible with libsodium's `crypto_box_seal`, so the browser can
produce capsules the OCW can open and vice-versa.

---

## 3. On-chain shape

### Storage items (in `pallet-social-feeds`)

```rust
/// Registered key service: account + X25519 pk + rotation version.
pub type KeyService<T: Config> = StorageValue<_, KeyServiceInfo<T::AccountId>, OptionQuery>;

/// Per-unlock record.
pub type Unlocks<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat, T::PostId,
    Blake2_128Concat, T::AccountId,
    UnlockRecord<T>,
    OptionQuery,
>;

/// OCW iteration index — present key = pending key delivery.
pub type PendingUnlocks<T: Config> =
    StorageMap<_, Blake2_128Concat, (T::PostId, T::AccountId), (), OptionQuery>;
```

`PostInfo` gained a `capsule: Option<BoundedVec<u8, ConstU32<80>>>`
field; public posts carry `None`, encrypted posts carry the sealed
content key.

### New extrinsics

```rust
// Admin (Root in dev, governance in prod).
pub fn set_key_service(
    origin: OriginFor<T>,
    account: T::AccountId,
    encryption_pk: [u8; 32],
) -> DispatchResult { ... }

// Creator: new 7th arg `capsule`.
pub fn create_post(
    origin: OriginFor<T>,
    content: BoundedVec<u8, T::MaxContentLen>,
    app_id: Option<T::AppId>,
    reply_fee: BalanceOf<T>,
    visibility: PostVisibility,
    unlock_fee: BalanceOf<T>,
    capsule: Option<BoundedVec<u8, ConstU32<80>>>,
) -> DispatchResult { ... }

// Viewer: new 2nd arg `buyer_pk`.
pub fn unlock_post(
    origin: OriginFor<T>,
    post_id: T::PostId,
    buyer_pk: [u8; 32],
) -> DispatchResult { ... }

// OCW-only unsigned delivery.
pub fn deliver_unlock_unsigned(
    origin: OriginFor<T>,
    payload: DeliverUnlockPayload<T>,
    _signature: T::Signature,
) -> DispatchResult { ... }
```

### Invariants enforced on-chain

| Rule | Error |
|------|-------|
| `Public` posts must not carry a capsule | `CapsuleInvalid` |
| Non-public posts must carry a capsule of exactly 80 bytes | `CapsuleInvalid` |
| Publishing encrypted content requires a registered key service | `KeyServiceNotConfigured` |
| `buyer_pk` cannot be all zeros | `InvalidBuyerPk` |
| Delivered `wrapped_key` must be exactly 80 bytes | `WrappedKeyInvalid` |
| Only one pending unlock per `(post_id, viewer)` | `AlreadyUnlocked` |
| OCW signed-payload window | `Custom(103) STALE_PAYLOAD` |
| OCW signer must match the current key service account | `Custom(102) SIGNER_NOT_KEY_SERVICE` |

---

## 4. Offchain worker

### Hook

```rust
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    #[cfg(feature = "std")]
    fn offchain_worker(block_number: BlockNumberFor<T>) {
        crate::offchain::run::<T>(block_number);
    }
}
```

### Lifecycle per pending unlock

1. `sp_io::offchain::is_validator()` — quits if not a collator.
2. Loads the X25519 secret from local offchain DB under
   `p2d::collator_sk::v1`.
3. Iterates `PendingUnlocks`, takes a `StorageLock` with
   `BlockAndTime` deadline so two consecutive blocks don't race.
4. Opens the post's capsule: `sk.unseal(&capsule)` → `k_content`.
5. Re-seals: `buyer_pk.seal(&mut rng, &k_content)` → `wrapped_key`.
6. Zeroizes `k_content`.
7. Signs and submits `deliver_unlock_unsigned` via
   `Signer::<T, T::AuthorityId>::any_account().send_unsigned_transaction(...)`.

### Anti-races

- `provides = (b"feeds-unlock", post_id, viewer).encode()` — only one
  pending delivery per `(post_id, viewer)` in the tx pool.
- `longevity = UnsignedValidityWindow` (16 blocks in the runtime) —
  stale payloads get dropped automatically.
- `StorageLock` deadline = `(2 blocks, 5s)` — survives a short RPC
  hiccup without letting a crashed worker starve the queue.

---

## 5. ValidateUnsigned

```rust
#[pallet::validate_unsigned]
impl<T: Config> ValidateUnsigned for Pallet<T> {
    type Call = Call<T>;
    fn validate_unsigned(
        source: TransactionSource,
        call: &Self::Call,
    ) -> TransactionValidity {
        if !matches!(source, TransactionSource::Local | TransactionSource::InBlock) {
            return InvalidTransaction::Call.into();
        }
        Pallet::<T>::validate_delivery(call)
    }
}
```

`validate_delivery` (extracted so a future migration to
`#[pallet::authorize]` is mechanical) enforces:

1. Payload's `block_number` within the validity window.
2. Signature over the SCALE-encoded payload.
3. `payload.public` resolves to the currently-registered
   `KeyService.account`.
4. Dedup tag per `(post_id, viewer)`.

---

## 6. Runtime wiring

```rust
parameter_types! {
    pub const FeedsUnsignedValidityWindow: BlockNumber = 16;
    pub const FeedsUnsignedPriority: TransactionPriority =
        TransactionPriority::MAX / 2;
}

impl pallet_social_feeds::Config for Runtime {
    // ... existing fields ...
    type AuthorityId = pallet_social_feeds::crypto::AuthorityId;
    type AdminOrigin = EnsureRoot<AccountId>;
    type UnsignedValidityWindow = FeedsUnsignedValidityWindow;
    type UnsignedPriority = FeedsUnsignedPriority;
}

// OCW glue: required by frame_system::offchain in stable2512.
impl SigningTypes for Runtime {
    type Public = <MultiSignature as Verify>::Signer;
    type Signature = MultiSignature;
}
impl<LocalCall> CreateTransactionBase<LocalCall> for Runtime
where RuntimeCall: From<LocalCall>
{
    type Extrinsic = UncheckedExtrinsic;
    type RuntimeCall = RuntimeCall;
}
impl<LocalCall> CreateBare<LocalCall> for Runtime
where RuntimeCall: From<LocalCall>
{
    fn create_bare(call: RuntimeCall) -> UncheckedExtrinsic {
        generic::UncheckedExtrinsic::new_bare(call).into()
    }
}
impl<LocalCall> CreateSignedTransaction<LocalCall> for Runtime
where RuntimeCall: From<LocalCall>
{
    fn create_signed_transaction<C>(
        _call: RuntimeCall, _public: _, _account: _, _nonce: _,
    ) -> Option<UncheckedExtrinsic> { None }
}
```

`transaction_version` bumped to 6.

---

## 7. Frontend

### Key-service lookup

```ts
export function useKeyService(): KeyService | null {
    const { getApi } = useSocialApi();
    const [ks, setKs] = useState<KeyService | null>(null);
    useEffect(() => {
        (async () => {
            const raw = await getApi().query.SocialFeeds.KeyService.getValue();
            setKs(raw ? {
                account: raw.account.toString(),
                encryptionPk: raw.encryption_pk.asBytes(),
                version: Number(raw.version),
            } : null);
        })();
    }, [getApi]);
    return ks;
}
```

### Encrypt at publish time

```ts
async function sealPostContent(plaintext: Uint8Array, collatorPk: Uint8Array) {
    const key = await generateContentKey();          // 32 bytes
    const aad = await aadFor(plaintext);             // blake2b-256(plaintext)
    const enc = await encrypt(plaintext, key, aad);  // XChaCha20-Poly1305
    const blob = encodeBlob(enc);                    // nonce || aad_len || aad || ct
    const capsule = await sealKey(key, collatorPk);  // libsodium crypto_box_seal (80 B)
    key.fill(0);
    return { blob, capsule };
}

// createPost flow when visibility !== "Public":
const { blob, capsule } = await sealPostContent(payload, keyService.encryptionPk);
const cid = await uploadRawToIpfs(blob);
const tx = api.tx.SocialFeeds.create_post({
    content: Binary.fromText(cid),
    app_id: numericId,
    reply_fee: 0n,
    visibility: { type: visibility, value: undefined },
    unlock_fee: BigInt(unlockFeeInput),
    capsule: FixedSizeBinary.fromBytes(capsule),
});
```

### Unlock on the viewer side

```ts
// 1. Generate ephemeral keypair, stash the secret, submit unlock_post.
const kp = await generateX25519Keypair();
stashBuyerSk(postId, kp.secretKey);
await api.tx.SocialFeeds.unlock_post({
    post_id: postId,
    buyer_pk: FixedSizeBinary.fromBytes(kp.publicKey),
}).signSubmitAndWatch(signer);

// 2. Poll Unlocks[postId][viewer] until wrapped_key is Some.
const raw = await api.query.SocialFeeds.Unlocks.getValue(postId, viewer);
if (!raw?.wrapped_key) return; // still waiting for the OCW

// 3. Unseal with the stashed secret, decrypt the IPFS ciphertext.
const sk = loadBuyerSk(postId);
const pk = await derivePublicKey(sk);
const contentKey = await unsealKey(raw.wrapped_key.asBytes(), pk, sk);
const blob = await fetchRawFromIpfs(cid);
const plaintext = await decrypt(decodeBlob(blob), contentKey);
contentKey.fill(0);
```

### Ephemeral secret storage

Buyer secrets live in `sessionStorage` under `feeds::buyer_sk::<post_id>`.
They are wiped when the tab closes. For durability an encrypted
localStorage backup keyed by a user passphrase could be added — out of
scope for the MVP.

---

## 8. Operator runbook

### Dev setup (one-time)

1. Generate an X25519 keypair offline:
   ```bash
   python3 -c "import os; print(os.urandom(32).hex())"   # sk
   # or use any sealed-box-capable tool; store sk safely
   ```
2. Insert the matching sr25519 delivery key into the collator's
   keystore:
   ```bash
   curl -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","method":"author_insertKey","params":["p2dc","<seed>","<sr25519-pub>"]}' \
     -id 1 http://127.0.0.1:9944
   ```
3. Write the 32-byte X25519 sk to local offchain DB under
   `p2d::collator_sk::v1`. A CLI helper lives in
   `cli/src/commands/p2d.rs` (future work); for now a small Rust
   script using `sp_core::offchain::testing::TestOffchainExt` is
   enough for the demo.
4. From a sudo account, publish the public half:
   ```ts
   api.tx.SocialFeeds.set_key_service({
       account: "<collator-sr25519-ss58>",
       encryption_pk: FixedSizeBinary.fromBytes(x25519_pk),
   });
   ```

### Health checks

- On every block the collator logs at `target = "social-feeds::ocw"`:
  - `warn!` if the local sk is missing — the operator has not
    completed step 3.
  - `warn!` on per-unlock failure (decrypt, reseal, submit).

### Rotation

Call `set_key_service` again with a new `(account, encryption_pk)`.
The pallet bumps the version. Old posts become undecryptable unless
their capsules are re-wrapped by the previous custodian.

---

## 9. Source map

| Concern | Path |
|---------|------|
| Types (`PostInfo`, `UnlockRecord`, `KeyServiceInfo`) | `blockchain/pallets/social-feeds/src/types.rs` |
| Pallet (storage, extrinsics, validate_unsigned) | `blockchain/pallets/social-feeds/src/lib.rs` |
| OCW (seal/unseal, submit unsigned) | `blockchain/pallets/social-feeds/src/offchain.rs` |
| AppCrypto (`KeyTypeId("p2dc")`) | `blockchain/pallets/social-feeds/src/lib.rs::crypto` |
| Runtime Config + OCW glue | `blockchain/runtime/src/configs/mod.rs` |
| Browser crypto helpers | `web/src/utils/postCrypto.ts` |
| React hook (`useKeyService`, `useUnlockEncryptedPost`) | `web/src/hooks/social/useEncryptedPosts.ts` |
| `AppDetailPage` integration | `web/src/pages/social/AppDetailPage.tsx` |

---

## 10. What's intentionally out of scope

- Escrow / refund on delivery timeout. The MVP trusts the collator.
  Production should add a `DeliveryDeadline + refund_unlock` path.
- Multi-collator threshold custody (DKG + FROST or similar).
- Watermarking / buyer-specific transforms.
- IPFS pinning. Currently relies on a public gateway for the demo.
- CLI tooling for `p2d init` / `p2d register`.

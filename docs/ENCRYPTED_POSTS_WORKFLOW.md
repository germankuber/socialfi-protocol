# Encrypted Posts — End-to-End Workflow

Detailed trace of what runs, where, and when, from the moment the node
boots to the moment a paying viewer decrypts a post. Each step cites
the exact source file and log line you should see.

Three cryptographic primitives are in play:

| Primitive | Purpose | Key size |
|---|---|---|
| **X25519 sealed-box** (`crypto_box_seal`) | Wraps the 32-byte content key to the collator key-service, then re-wraps it to the viewer's ephemeral key. | 32-byte keys → 80-byte output |
| **XChaCha20-Poly1305** (AEAD) | Encrypts the post body (text + optional image CID) with a fresh per-post content key. | 32-byte key, 24-byte nonce |
| **BLAKE2b-256** | Produces the AAD bound into each encrypted blob so tampering is rejected. | 32 bytes |

Four identities are in play — keep them straight:

| Identity | Type | Whose secret | Lives where |
|---|---|---|---|
| **Author** | sr25519 (Alice/Bob/Charlie…) | User's wallet | Browser extension |
| **Viewer** | sr25519 (a different dev account) | User's wallet | Browser extension |
| **Key-service account** | sr25519, seed `//KeyService` | The node | Keystore (`KeyTypeId=p2dc`) |
| **Key-service encryption** | X25519, derived from `DEV_SEED` | The node | In-source constant (dev only) |

---

## Phase 0 — Node boot (`make node`)

**Script:** `scripts/start-dev.sh` → `scripts/common.sh :: start_local_node_background`

1. `build_runtime` compiles `stack-template-runtime` (and therefore
   `pallet-social-feeds`) to **WASM**. The OCW hook lives inside this
   WASM blob, **not** in the native host binary — see the important
   note in step 4.

2. `generate_chain_spec` bakes `SocialFeedsConfig::key_service` into
   genesis via `genesis_config_presets.rs`:

   ```rust
   // blockchain/runtime/src/genesis_config_presets.rs
   let key_service_account = sp_core::crypto::AccountId32::from(
       pallet_social_feeds::dev_key::key_service_account_id(),
   );

   social_feeds: SocialFeedsConfig {
       key_service: Some(pallet_social_feeds::types::KeyServiceInfo {
           account: key_service_account,            // sr25519 pk of //KeyService
           encryption_pk: pallet_social_feeds::dev_key::public_key_bytes(),
           version: 1,
       }),
       ..Default::default()
   },
   ```

   The `account` field is the sr25519 public key of `//KeyService`
   (pinned as a 32-byte constant in `dev_key.rs`). The `encryption_pk`
   is the X25519 public key derived from `DEV_SEED`.

3. The node starts with these flags (from `common.sh`):

   ```bash
   polkadot-omni-node \
     --chain chain_spec.json --tmp --alice \
     --force-authoring \
     --offchain-worker always \
     --dev-block-time 3000 --rpc-port 9944
   ```

   `--offchain-worker always` is **load-bearing** — without it,
   `offchain_worker` only runs when `is_validator()` says yes based on
   session keys. We don't have a proper session setup in solo dev, so
   `always` forces the hook to fire every block.

4. On first block, the pallet's `BuildGenesisConfig` logs:

   ```
   🔑 GENESIS: registering key service version=1 account=96de8f93… (5FUX9u9D...) pk=[c4, 9e, ab, 89, …]
   ```

5. `wait_for_substrate_rpc` blocks until `system_health` responds.

6. `insert_key_service_in_keystore` reads the on-chain
   `SocialFeeds.KeyService.account` via `state_getStorage`, takes the
   first 32 bytes (the sr25519 public key), and calls
   `author_insertKey`:

   ```bash
   # scripts/common.sh
   curl -d '{
     "jsonrpc":"2.0","id":1,"method":"author_insertKey",
     "params":["p2dc","//KeyService","0x96de8f93…"]
   }' http://localhost:9944
   ```

   Now the keystore has an sr25519 seed under `KeyTypeId(*b"p2dc")`.
   The OCW's `Signer::<T, T::AuthorityId>::any_account()` will find it.

   Output: `INFO: Key-service identity installed (pk=0x96de8f93…)`

### Important note on WASM vs native

`pallet_social_feeds::offchain::run` **must** be compiled into the
runtime WASM. Our original version had
`#[cfg(feature = "std")] pub mod offchain;`, which meant the module
disappeared from the WASM build and the OCW hook became a no-op.

The fix:

```rust
// blockchain/pallets/social-feeds/src/lib.rs
pub mod offchain;                    // no cfg — must reach WASM

#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn offchain_worker(block_number: BlockNumberFor<T>) {
        crate::offchain::run::<T>(block_number);  // no cfg either
    }
}
```

This only compiles because the crypto crates are all `no_std`-capable:

```toml
# blockchain/pallets/social-feeds/Cargo.toml
crypto_box  = { version = "0.9", default-features = false, features = ["seal","salsa20","alloc","rand_core"] }
rand_chacha = { version = "0.3", default-features = false }
zeroize     = { version = "1.8", default-features = false, features = ["derive"] }
```

---

## Phase 1 — Author publishes an encrypted post (Frontend → Chain)

The author picks visibility `Obfuscated` or `Private` in the UI, types
content, optionally picks an image, hits Publish.

### 1a. Encrypt locally (browser)

**File:** `web/src/hooks/social/useEncryptedPosts.ts`

```ts
// Generate fresh symmetric key + seal it to the collator's X25519 pk.
export async function sealPostContent(
    plaintext: Uint8Array,
    collatorPk: Uint8Array,
): Promise<SealedPostContent> {
    const key     = await generateContentKey();         // 32 random bytes
    const aad     = await aadFor(plaintext);            // BLAKE2b-256(plaintext)
    const enc     = await encrypt(plaintext, key, aad); // XChaCha20-Poly1305
    const blob    = encodeBlob(enc);                    // nonce‖aad_len‖aad‖ct
    const capsule = await sealKey(key, collatorPk);     // 80 bytes
    key.fill(0);                                        // zeroize
    return { blob, capsule };
}
```

**File:** `web/src/utils/postCrypto.ts`

```ts
export function encodeBlob(blob: EncryptedBlob): Uint8Array {
    // 24 bytes nonce | 4 bytes aad_len (u32 LE) | aad | ciphertext+tag
    const out = new Uint8Array(NONCE_LEN + 4 + blob.aad.length + blob.ciphertext.length);
    out.set(blob.nonce, 0);
    new DataView(out.buffer).setUint32(NONCE_LEN, blob.aad.length, true);
    out.set(blob.aad, NONCE_LEN + 4);
    out.set(blob.ciphertext, NONCE_LEN + 4 + blob.aad.length);
    return out;
}
```

### 1b. Upload the ciphertext blob to IPFS

**File:** `web/src/hooks/social/useEncryptedPosts.ts`

```ts
export async function uploadRawToIpfs(bytes: Uint8Array): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "application/octet-stream" }), "enc.bin");
    const res = await fetch("https://api.thegraph.com/ipfs/api/v0/add", {
        method: "POST",
        body: form,
    });
    const json = await res.json();
    return json.Hash;  // e.g. QmYvAUR…
}
```

The blob on IPFS is opaque binary — verifiable by hand:

```bash
curl https://ipfs.io/ipfs/<CID> | xxd | head
# 00000000: a9a9 7a57 … (nonce)
# 00000018: 2000 0000   (aad_len = 32, little-endian)
# 0000001c: 28ca 693b … (aad: BLAKE2b-256 of plaintext)
# 0000003c: …           (ciphertext + Poly1305 tag)
```

### 1c. Call `create_post` with the CID + capsule

**File:** `web/src/pages/social/AppDetailPage.tsx`

```ts
const tx = api.tx.SocialFeeds.create_post({
    content:     Binary.fromText(cid),          // CID of the encrypted blob
    app_id:      numericId,
    reply_fee:   BigInt(replyFee),
    visibility:  { type: "Obfuscated", value: undefined },
    unlock_fee:  BigInt(unlockFeeInput),
    capsule:     FixedSizeBinary.fromBytes(capsule),  // 80-byte sealed-box
});
```

### 1d. Pallet validates + stores

**File:** `blockchain/pallets/social-feeds/src/lib.rs :: create_post`

```rust
match (&visibility, &capsule) {
    (PostVisibility::Public, None) => {},
    (PostVisibility::Public, Some(_)) => return Err(Error::<T>::CapsuleInvalid.into()),
    (_, Some(c)) if c.len() as u32 == SEALED_KEY_LEN => {},  // 80
    _ => return Err(Error::<T>::CapsuleInvalid.into()),
}
if capsule.is_some() {
    ensure!(KeyService::<T>::exists(), Error::<T>::KeyServiceNotConfigured);
    log::info!(target: "social-feeds", "📝 encrypted create_post author={:?} …");
}
```

Chain state after this step:

```
Posts[0] = {
    author: Alice,
    content: "QmYvAUR…",      // IPFS CID of the encrypted blob
    visibility: Obfuscated,
    unlock_fee: 100,
    capsule: Some([80 bytes]),  // sealed-box wrapping the content key
    …
}
```

Node log: `📝 encrypted create_post author=… visibility=… capsule_len=80`

---

## Phase 2 — Viewer pays to unlock (Frontend → Chain)

The viewer (a *different* account — Bob, say) opens the app, sees the
post with the Unlock button.

### 2a. Generate ephemeral X25519 keypair

**File:** `web/src/hooks/social/useEncryptedPosts.ts :: start()`

```ts
const start = async (signer: PolkadotSigner): Promise<boolean> => {
    if (postId === null) return false;
    const kp = await generateX25519Keypair();      // fresh ephemeral pair
    stashBuyerSk(postId, kp.secretKey);            // sessionStorage only
    const tx = getApi().tx.SocialFeeds.unlock_post({
        post_id: postId,
        buyer_pk: FixedSizeBinary.fromBytes(kp.publicKey),
    });
    const ok = await tracker.submit(tx, signer, "Unlock post");
    if (!ok) { dropBuyerSk(postId); return false; }
    setState({ status: "awaiting-key" });
    return true;
};
```

The **secret key never leaves the browser tab**. The public key
travels on-chain and ends up as the recipient of the re-sealed
content key.

`postId === null` (not `!postId`) matters because `BigInt(0)` is falsy
in JS — otherwise the first post would never unlock.

### 2b. Pallet records the pending unlock

**File:** `blockchain/pallets/social-feeds/src/lib.rs :: unlock_post`

```rust
pub fn unlock_post(origin, post_id, buyer_pk: [u8; 32]) -> DispatchResult {
    let who = ensure_signed(origin)?;
    let post = Posts::<T>::get(post_id).ok_or(Error::<T>::PostNotFound)?;
    ensure!(post.visibility != PostVisibility::Public, Error::<T>::PostIsPublic);
    if who == post.author { return Ok(()); }            // author has implicit access
    ensure!(!Unlocks::<T>::contains_key(post_id, &who), Error::<T>::AlreadyUnlocked);

    if post.unlock_fee > Zero::zero() {
        T::Currency::transfer(&who, &post.author, post.unlock_fee,
            ExistenceRequirement::KeepAlive)?;
    }

    Unlocks::<T>::insert(post_id, &who, UnlockRecord::<T> {
        buyer_pk, wrapped_key: None, requested_at: frame_system::Pallet::<T>::block_number(),
    });
    PendingUnlocks::<T>::insert((post_id, who.clone()), ());

    log::info!(target: "social-feeds",
        "💰 unlock_post paid post_id={:?} viewer={:?} fee={:?} buyer_pk={:02x?}",
        post_id, who, post.unlock_fee, &buyer_pk[..8]);

    Self::deposit_event(Event::PostUnlocked { post_id, viewer: who, author: post.author,
                                              fee_paid: post.unlock_fee });
    Ok(())
}
```

Chain state:

```
Unlocks[0][Bob] = {
    buyer_pk: <Bob's ephemeral X25519 pk>,
    wrapped_key: None,            // ← OCW will fill this
    requested_at: <current block>,
}
PendingUnlocks[(0, Bob)] = ();   // signal for the OCW
```

Node log: `💰 unlock_post paid post_id=0 viewer=5Grw…utQY fee=100 buyer_pk=[…]`

---

## Phase 3 — OCW delivers the wrapped key (Runtime WASM → Chain)

Every block, inside the runtime WASM, the hook fires:

```rust
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn offchain_worker(block_number: BlockNumberFor<T>) {
        crate::offchain::run::<T>(block_number);
    }
}
```

### 3a. Pre-flight

**File:** `blockchain/pallets/social-feeds/src/offchain.rs :: run()`

```rust
pub fn run<T: Config>(block_number: BlockNumberFor<T>) {
    if !sp_io::offchain::is_validator() { return; }           // skip non-validators
    let Some(ks) = KeyService::<T>::get() else { return; };   // skip if not configured

    let sk = dev_key::secret_key();                           // X25519 secret from DEV_SEED
    let pending_count = PendingUnlocks::<T>::iter().count();
    if pending_count == 0 { return; }

    log::info!(target: "social-feeds::ocw",
        "🛰️ OCW tick block={:?} pending={} key_service_version={}",
        block_number, pending_count, ks.version);
    …
}
```

### 3b. Per-entry lock + deliver

```rust
for ((post_id, viewer), _) in PendingUnlocks::<T>::iter() {
    if delivered >= MAX_DELIVERIES_PER_BLOCK { break; }

    // Prevent two consecutive blocks racing on the same (post, viewer).
    let lock_key = (b"feeds-unlock-lock", post_id, viewer.clone()).encode();
    let mut lock = StorageLock::<BlockAndTime<frame_system::Pallet<T>>>::
        with_block_and_time_deadline(&lock_key, 2u32.into(),
                                     Duration::from_millis(LOCK_TTL_MS));
    let guard = match lock.try_lock() { Ok(g) => g, Err(_) => continue };

    match try_deliver::<T>(&sk, post_id, &viewer, block_number) {
        Ok(()) => log::info!("✅ delivered post_id={:?} viewer={:?}", post_id, viewer),
        …
    }
    drop(guard);
}
```

### 3c. The actual crypto + signed submit

```rust
fn try_deliver<T: Config>(
    sk: &crypto_box::SecretKey, post_id: T::PostId, viewer: &T::AccountId,
    block_number: BlockNumberFor<T>,
) -> Result<(), OcwError> {
    let record = Unlocks::<T>::get(post_id, viewer).ok_or(OcwError::Gone)?;
    if record.wrapped_key.is_some() { return Err(OcwError::Gone); }  // already delivered

    let post = Posts::<T>::get(post_id).ok_or(OcwError::Gone)?;
    let capsule = post.capsule.as_ref().ok_or(OcwError::Gone)?.to_vec();

    // 1. Open the capsule with the custodial X25519 secret → 32-byte content key.
    let k_content = sk.unseal(&capsule).map_err(|_| OcwError::DecryptFailed)?;

    // 2. Re-seal that key to the viewer's ephemeral pk.
    let buyer_pk = CboxPublic::from(record.buyer_pk);
    let mut rng = ChaCha20Rng::from_seed(sp_io::offchain::random_seed());
    let wrapped = buyer_pk.seal(&mut rng, &k_content).map_err(|_| OcwError::SealFailed)?;

    // 3. Zeroize k_content before it leaves scope.
    { use zeroize::Zeroize; let mut k = k_content; k.zeroize(); }

    if wrapped.len() as u32 != SEALED_KEY_LEN { return Err(OcwError::SealFailed); }
    let wrapped_key: BoundedVec<_, ConstU32<{SEALED_KEY_LEN}>> =
        wrapped.try_into().map_err(|_| OcwError::Encoding)?;

    // 4. Sign the payload with the `//KeyService` sr25519 key (from the keystore)
    //    and submit as an unsigned-with-signed-payload transaction.
    let signer = Signer::<T, T::AuthorityId>::any_account();
    let result = signer.send_unsigned_transaction(
        |account| DeliverUnlockPayload {
            public: account.public.clone(),
            block_number, post_id,
            viewer: viewer.clone(),
            wrapped_key: wrapped_key.clone(),
        },
        |payload, signature| Call::deliver_unlock_unsigned { payload, signature },
    );
    match result { Some((_, Ok(()))) => Ok(()), _ => Err(OcwError::SubmitFailed) }
}
```

Why **unsigned with signed payload**?

* The OCW doesn't pay fees (it's infrastructure, not a user).
* The runtime can still verify it's the legitimate key-service account
  via a signature check (see next step).

### 3d. On-chain validation (`ValidateUnsigned`)

**File:** `blockchain/pallets/social-feeds/src/lib.rs :: validate_delivery`

```rust
// 1. Freshness: reject payloads older than UnsignedValidityWindow.
if payload.block_number > now || now.saturating_sub(payload.block_number) > window {
    return InvalidTransaction::Custom(unsigned_error::STALE_PAYLOAD).into();
}

// 2. Signature against the embedded public key.
let valid = SignedPayload::<T>::verify::<T::AuthorityId>(payload, signature);
if !valid { return InvalidTransaction::BadProof.into(); }

// 3. Signer MUST be the current on-chain KeyService.account.
let ks = KeyService::<T>::get().ok_or_else(|| … )?;
let signer: T::AccountId = payload.public.clone().into_account();
if signer != ks.account {
    return InvalidTransaction::Custom(unsigned_error::SIGNER_NOT_KEY_SERVICE).into();
}

// 4. Per (post_id, viewer) dedup tag — keeps duplicates out of the txpool.
let tag = (b"feeds-unlock", payload.post_id, payload.viewer.clone()).encode();
ValidTransaction::with_tag_prefix("social-feeds-unlock").and_provides(tag).build()
```

Check #3 is why boot-time key insertion matters: the keystore's `p2dc`
key **must** match the genesis `KeyService.account`. The script reads
one from the other to guarantee alignment.

### 3e. The dispatch writes back

**File:** `blockchain/pallets/social-feeds/src/lib.rs :: deliver_unlock_unsigned`

```rust
pub fn deliver_unlock_unsigned(origin, payload, _signature) -> DispatchResult {
    ensure_none(origin)?;
    ensure!(payload.wrapped_key.len() as u32 == SEALED_KEY_LEN, Error::<T>::WrappedKeyInvalid);

    Unlocks::<T>::try_mutate(payload.post_id, &payload.viewer, |maybe| {
        let record = maybe.as_mut().ok_or(Error::<T>::UnlockNotPending)?;
        ensure!(record.wrapped_key.is_none(), Error::<T>::UnlockNotPending);
        record.wrapped_key = Some(payload.wrapped_key.clone());
        Ok(())
    })?;
    PendingUnlocks::<T>::remove((payload.post_id, payload.viewer.clone()));

    log::info!(target: "social-feeds",
        "🔓 deliver_unlock_unsigned accepted post_id={:?} viewer={:?} wrapped_key_len={}",
        payload.post_id, payload.viewer, payload.wrapped_key.len());
    …
}
```

Chain state after:

```
Unlocks[0][Bob].wrapped_key = Some(<80 bytes re-sealed to Bob's pk>)
PendingUnlocks[(0, Bob)]     = removed
```

Node log, in order:

```
💰 unlock_post paid     post_id=0 viewer=5Grw…utQY …
🛰️  OCW tick             block=29 pending=1 key_service_version=1
✅ delivered            post_id=0 viewer=5Grw…utQY
🔓 deliver_unlock…      accepted post_id=0 viewer=5Grw…utQY wrapped_key_len=80
```

---

## Phase 4 — Viewer decrypts (Browser only)

**File:** `web/src/hooks/social/useEncryptedPosts.ts :: useUnlockEncryptedPost`

### 4a. Poll the on-chain unlock record

```ts
useEffect(() => {
    if (postId === null || !viewer) return;
    let cancelled = false;
    (async () => {
        const raw = await getApi().query.SocialFeeds.Unlocks.getValue(postId, viewer);
        if (cancelled || !raw) return;
        if (raw.wrapped_key) setWrappedKey(raw.wrapped_key.asBytes());
    })();
    return () => { cancelled = true; };
}, [getApi, postId, viewer, blockNumber]);  // re-runs every block
```

`blockNumber` in the dep list makes this re-poll on every import — so
within 1–2 blocks of the OCW delivery, the frontend picks it up.

### 4b. Decrypt locally

```ts
const decryptNow = async (ipfsCid: string,
                          fetchRaw: (cid: string) => Promise<Uint8Array>) => {
    if (postId === null || !wrappedKey) return;
    const sk = loadBuyerSk(postId);                   // sessionStorage
    if (!sk) { setState({ status: "error",
                          error: "buyer secret not found in this browser tab" }); return; }

    const pk          = await derivePublicKey(sk);    // scalarmult_base
    const contentKey  = await unsealKey(wrappedKey, pk, sk);  // crypto_box_seal_open
    const blob        = await fetchRaw(ipfsCid);      // GET https://ipfs.io/ipfs/<CID>
    const decoded     = decodeBlob(blob);             // split nonce / aad / ct
    const pt          = await decrypt(decoded, contentKey);   // XChaCha20-Poly1305
    contentKey.fill(0);
    setState({ status: "ready", plaintext: pt });
};
```

`decodeBlob` is the exact inverse of `encodeBlob` from phase 1a.

### 4c. Render

**File:** `web/src/pages/social/AppDetailPage.tsx :: EncryptedPostUnlock`

```tsx
useEffect(() => {
    if (!wrappedKey || decoded) return;
    (async () => { await decryptNow(cid, fetchRawFromIpfs); })();
}, [wrappedKey, cid, decoded, decryptNow]);

useEffect(() => {
    if (state.status === "ready" && state.plaintext) {
        try {
            const parsed = JSON.parse(new TextDecoder().decode(state.plaintext));
            setDecoded({ text: parsed.text ?? "", image: parsed.image });
        } catch {
            setDecoded({ text: new TextDecoder().decode(state.plaintext) });
        }
    }
}, [state]);
```

When `decoded` is non-null, the component renders the decrypted text
with a "Decrypted locally" badge. Until then it shows one of:
*"Unlock for N units"* → *"Waiting for collator to deliver the key…"* →
*"Key delivered — decrypting…"* → the plaintext.

---

## What goes wrong if any link breaks

| Symptom | Likely cause |
|---|---|
| Unlock button has no effect | `postId === 0n` falsy bug (use `postId === null`) |
| `PendingUnlocks` keeps filling but `wrapped_key` stays `None` for every viewer | OCW not running: check `--offchain-worker always`, `#[cfg(feature = "std")]` removed from the `offchain` module |
| OCW logs `🛰️` but never `✅` | `any_account()` found no sr25519 key under `p2dc` → keystore not primed (re-run `insert_key_service_in_keystore`) |
| OCW submits but `validate_unsigned` rejects with `SIGNER_NOT_KEY_SERVICE` | Keystore pk ≠ on-chain `KeyService.account` — probably a stale chain spec |
| `decryptNow` errors with "buyer secret not found in this browser tab" | Tab refreshed after `unlock_post` but before key delivery; sessionStorage lost the X25519 secret. Must re-unlock from a new account (or use localStorage if that tradeoff is acceptable) |
| IPFS fetch of the ciphertext fails with `ERR_NAME_NOT_RESOLVED` | Dead gateway (e.g. `cloudflare-ipfs.com`). The encrypted path uses `ipfs.io`; the public-post helper `useIpfs` needs its gateway list audited |

---

## Security properties (and where they come from)

* **The IPFS gateway never sees plaintext.** The blob is AEAD
  ciphertext + nonce + AAD; without the 32-byte content key, it's
  indistinguishable from random.
* **The chain never sees the content key.** Only the capsule (to the
  key-service) and the wrapped key (to the viewer) — both opaque
  sealed-boxes.
* **The collator cannot impersonate a viewer.** It doesn't have the
  viewer's X25519 secret key, so it can only *produce* a wrap, never
  *read* one it produced for someone else.
* **The collator can decrypt any post.** This is the weak point of
  the custodial model — the dev `DEV_SEED` is a public constant. A
  real deployment would replace it with TEE-backed key storage, a DKG
  across collators, or a threshold sealing scheme.
* **Signed unlock deliveries are non-forgeable within the validity
  window.** `validate_delivery` checks signature + signer identity +
  freshness, and the dedup tag prevents replay into the txpool.

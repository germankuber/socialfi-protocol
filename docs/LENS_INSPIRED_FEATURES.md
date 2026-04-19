# Lens-Inspired Features for Polkadot Hackathon

Informe completo de diseño de features inspiradas en Lens Protocol (V2/V3) portadas a Polkadot/FRAME, con foco en **custom origins** y primitivos complejos del polkadot-sdk. Pensado para un hackathon donde la métrica es "cuántos primitivos distintos del SDK demuestro".

---

## Tabla de contenidos

1. [Análisis del código actual](#1-análisis-del-código-actual)
2. [Primitivos de Lens Protocol relevantes](#2-primitivos-de-lens-protocol-relevantes)
3. [Catálogo de pallets/primitivos Polkadot](#3-catálogo-de-palletsprimitivos-polkadot)
4. [Catálogo de features (1 feature = 1 primitivo único)](#4-catálogo-de-features-1-feature--1-primitivo-único)
5. [Fichas técnicas detalladas por feature](#5-fichas-técnicas-detalladas-por-feature)
6. [Combos recomendados](#6-combos-recomendados)
7. [Cómo elegir (criterio anti-solape)](#7-cómo-elegir-criterio-anti-solape)
8. [Polkadot vs Lens: tabla comparativa](#8-polkadot-vs-lens-tabla-comparativa)

---

## 1. Análisis del código actual

### Lo implementado en este repo (rama `feat/vault-qr-signing`)

**Blockchain (Substrate FRAME):**

- **Template Pallet** (PoE): `blockchain/pallets/template/src/lib.rs` — storage `Claims<H256 → (owner, block_number)>`, extrinsics `create_claim`/`revoke_claim`.
- **Social Ecosystem (4 pallets propios):**
  - `pallet-social-profiles` (idx 52): registry 1-profile-por-account, bond-based. Trait `ProfileProvider`.
  - `pallet-social-graph` (idx 53): follow relationships con fees. Trait `GraphProvider`.
  - `pallet-social-feeds` (idx 54): posts inmutables con visibility (Public/Obfuscated/Private).
  - `pallet-social-app-registry` (idx 51): app registry con bond anti-spam. Trait `AppProvider`.
- **pallet-identity** (idx 55): integrado en esta rama. Judgements, sub-accounts, username authorities.

**Frontend (React/PAPI):**

- Pages: HomePage, PeoplePage, ProtocolStatsPage, SocialDashboard, ProfilePage, PublicProfilePage, EditProfilePage, CreateProfilePage, AppsPage, FeedPage, GraphPage, TransactionsPage, AppDetailPage, PostDetailPage, AccountsPage.
- 16 componentes en `web/src/components/social/` (ProfileCard, IdentityBadge, VerifiedBadge, IdentityPanel, etc).
- Hooks: `useIdentity`, `useProfileCache`, `useSocialApi`, `useTxTracker`, `useIpfs`, `useSelectedAccount`.

**Smart Contracts:** `ProofOfExistence.sol` compilado a EVM y PVM via `pallet-revive`.

**CLI:** comandos `chain`, `contract`, `pallet`, `prove`.

### Pallets de Polkadot ya integrados

`pallet-system`, `pallet-balances`, `pallet-identity` (nuevo), `pallet-session`, `pallet-aura`, `pallet-authorship`, `pallet-sudo`, `pallet-timestamp`, pallets de cumulus (parachain-system, xcmp-queue, message-queue), `pallet-revive` (idx 90), `pallet-statement` (idx 40, Statement Store).

**Notablemente ausente:** pallet-proxy, pallet-democracy, pallet-referenda, pallet-scheduler, pallet-recovery, pallet-nfts, pallet-multisig, pallet-meta-tx, transaction extensions custom.

### Estilo arquitectónico

- Composición via traits (`ProfileProvider`, `GraphProvider`, `AppProvider`, `PostProvider`).
- Economía basada en bonds.
- Dual EVM+PVM por `pallet-revive`.
- IPFS para metadata off-chain (CIDs on-chain).
- Frontend tipado con PAPI.

---

## 2. Primitivos de Lens Protocol relevantes

### Core primitives

- **Profile NFT (V2) / Account (V3):** contenedor raíz de identidad, posee publicaciones, followers, managers.
- **Handle / Username (V3):** NFT dentro de un Namespace, transferible.
- **Follow NFT:** ERC-721 minteado al seguidor, convierte seguidores en assets portables.
- **Publication:** Post, Comment, Mirror, Quote — gramática social universal.
- **Collect NFT:** monetización + prueba de engagement.

### Sistema de módulos

- **Follow Modules:** gate de quién puede seguir (fee, token-gated, whitelist).
- **Reference Modules:** gate de quién comenta/mirror/quote.
- **Collect Modules / Action Modules:** pricing/limits/timing/auctions/splits.
- **Open Actions (V2):** cualquier contrato externo whitelisted puede hookearse a `act()`.
- **Module Registry:** whitelisting governance-gated.

### Delegation / UX

- **Profile Manager / Delegated Executors:** permiso fino a N addresses sin transferir ownership.
- **Signless:** relayer gasless vía meta-tx EIP-712.

### Monetización

- Fee Follow, Fee/Limited/Timed Collect, Revenue Split (MultirecipientFeeCollect), Referral Fee, ERC4626FeeCollect (auto-yield).

### Grafo / reputación

- Graph primitive (V3): múltiples grafos coexisten.
- Feed primitive (V3): publicaciones extraídas del Profile.
- Block/Mute. Reputación (LensScore, Karma3Labs).

### Contenido

- `contentURI` (ipfs/arweave), LIP-2 metadata schemas, **Momoka** (Data Availability layer off-chain).

### V3-specific

- Graphs / Feeds / Groups / Namespaces como primitivos deployables independientes.
- **Rules Engine:** cada primitivo es rule-based, reglas componibles AND/OR.
- **Apps** como entidad de primera clase con analytics y sponsorships.
- **Sponsorships** reemplazan V2 gasless.

---

## 3. Catálogo de pallets/primitivos Polkadot

### Custom Origins — el núcleo

- **`RawOrigin<AccountId>`**: base (Root, Signed, None).
- **`RuntimeOrigin`**: outer enum amalgamado por `construct_runtime!`.
- **`EnsureOrigin<OuterOrigin>`**: guard trait.
- **`EnsureOriginWithArg<O, A>`**: variante parametrizada.
- **Combinadores**: `EitherOfDiverse`, `EitherOf`, `MapSuccess`, `TryMapSuccess`.
- **Declaración**:
  ```rust
  #[pallet::origin]
  pub enum Origin<T: Config> { Variant(T::AccountId) }
  ```

### Pallets relevantes

| Pallet | Resumen | Uso hackathon |
|---|---|---|
| pallet-identity | Registrars + judgements + subs + usernames | Blue checks, gating |
| pallet-proxy | Time-delayed delegation + ProxyTypes | Profile Managers |
| pallet-multisig | Threshold dispatch | Squad treasury |
| pallet-assets | Asset registry con roles | In-app tokens |
| pallet-nfts | NFT v2: namespaces, pre-signed mints, roles | Collect NFTs, handles |
| pallet-scheduler | Dispatch diferido con RetryConfig | Auction end, timed drops |
| pallet-preimage | Calls grandes bounded | Governance |
| pallet-referenda | Track-based voting con auto-dispatch | Moderación community |
| pallet-conviction-voting | Vote/delegate con conviction | Governance UX |
| pallet-ranked-collective | Membership jerárquico | Fellowship |
| pallet-treasury | Pot + typed spend | Grants |
| pallet-utility | batch, as_derivative, dispatch_as | Manufacturar origins |
| pallet-revive | PolkaVM + eth-rpc | Dual contracts |
| pallet-tx-pause | Pause per-call dinámico | Kill-switch |
| pallet-safe-mode | Whitelist chain-wide | Emergency freeze |
| pallet-recovery | Social recovery M-of-N | Handle recovery |
| pallet-society | Membership privado con bids | Scarcity DAO |
| pallet-nomination-pools | Pools de delegators | LST |
| pallet-message-queue | Queue bounded en on_initialize | Async jobs |
| pallet-xcm | XCM dispatcher + AuthorizedAliasers | Cross-chain identity |
| pallet-statement | Statement Store (off-chain gossip firmado) | DA, Momoka-killer |
| pallet-verify-signature | Tx extension para firmas alt | Passkeys, WebAuthn |
| pallet-meta-tx | Meta-tx dispatcher | Gasless |
| pallet-broker | Coretime (cores, regions, CoreMask) | Flash collect |

### Features avanzadas de FRAME

- **Runtime hooks**: `on_initialize`, `on_finalize`, `on_idle`, `on_runtime_upgrade`, `offchain_worker`.
- **Transaction Extensions (v2, stable2409+)**: pipeline componible `TransactionExtension<Call>` con `validate`+`prepare`+`implicit`.
- **Holds/Freezes**: traits `fungible::MutateHold`/`MutateFreeze` con `#[pallet::composite_enum] HoldReason`.
- **Storage migrations**: `VersionedMigration<From, To, ..>`.
- **Runtime APIs**: `impl_runtime_apis!`.
- **Bounded collections**: `BoundedVec`, `BoundedBTreeMap`.
- **`BlockNumberProvider`**: relay chain vs parachain.
- **Instanced pallets**: `pallet::Pallet<T, I = ()>`.
- **XCMv5**: `InitiateTransfer`, `PayFees`, `ExecuteWithOrigin`, `AuthorizedAliasers`.
- **pallet-revive precompiles**: bridge Solidity↔pallets.

### People Chain

System parachain dedicada a `pallet-identity`. Soporta usernames authority-granted. Cross-chain resolution vía XCM + `AuthorizedAliasers` (XCMv5).

---

## 4. Catálogo de features (1 feature = 1 primitivo único)

Cada feature demuestra **un primitivo diferente** del polkadot-sdk. No hay solape — si una feature ya usa X, ninguna otra lo usa.

| # | Primitivo único demostrado | Feature social | Custom Origin |
|---|---|---|---|
| **A** | `pallet-proxy` + `InstanceFilter` custom | Profile Manager / Executors delegados | `Origin::ProfileManager { profile_id, scope }` |
| **B** | **XCM v5** (`Transact` + `DescendOrigin` + `ExecuteWithOrigin`) | Open Actions cross-chain (collect desde Asset Hub) | `Origin::OpenAction { actor: MultiLocation, module }` |
| **C** | **`TransactionExtension` custom** (pipeline v2) | Gasless / Sponsored posts | `Origin::Sponsored { sponsor, user, app }` |
| **D** | **`pallet::Instance*`** (instanced pallets) | Multi-grafo (Pro vs Anon, Instance1/Instance2) | `GraphOrigin<I>::Follower` (parametrizado) |
| **E** | **XCM v5 `AuthorizedAliasers`** | Verified Handle desde People Chain | `SocialOrigin::PeopleVerified { judgement }` |
| **F** | **`pallet-statement` (Statement Store)** | Momoka-killer: posts off-chain con gossip firmado | `Origin::StatementAuthor { statement_hash }` |
| **G** | **`pallet-referenda` custom track** + `pallet-ranked-collective` | Moderación comunitaria (sólo OpenGov borra posts) | `Origin::CommunityModerated { referendum_index }` |
| **H** | **`pallet-scheduler` + `on_idle` hook** | Mirror referral splits con payouts batched | `Origin::ReferralClaim { mirror_chain }` |
| **I** | **`pallet-recovery`** + `pallet-society` | Phoenix: recuperar handle con guardianes sociales | `Origin::RecoveredProfile { new_owner }` |
| **J** | **`MutateHold` + composite `HoldReason`** + `pallet-nfts` pre-signed mints | Collect con escrow atómico y voucher off-chain | `Origin::Collector { paid, voucher_hash }` |
| **K** | **`pallet-broker` / Coretime** | Flash collect: creator compra core para drop viral | `Origin::CollectHost { region_id }` |
| **L** | **`pallet-verify-signature` tx-ext** + passkeys/WebAuthn | Login social con passkey (sin seed phrase) | `Origin::PasskeyAuth { device_id }` |

---

## 5. Fichas técnicas detalladas por feature

### A. Profile Manager — `pallet-proxy` + ProxyType custom

**Inspiración Lens:** Profile Manager V2 (executors delegados).

**Custom Origin:**
```rust
#[pallet::origin]
pub enum Origin<T> {
    ProfileManager { profile_id: ProfileId, executor: T::AccountId, scope: ManagerScope },
}
```

**Guard:** `EnsureProfileManager<T, S: Get<ManagerScope>>` lifts `Signed(executor)` consultando `ProfileManagers: Map<(ProfileId, AccountId), BitFlags<ManagerScope>>`.

**Primitivo Polkadot:** `pallet-proxy` con `SocialProxyType { Posting, Social, Monetization, Any }` implementando `InstanceFilter<RuntimeCall>`.

**Extrinsics:**
- `add_profile_manager(profile, executor, scopes)`
- `revoke_profile_manager(profile, executor)`
- `act_as_manager(profile, boxed_call)`
- `set_manager_expiry(profile, executor, block)`

**Storage:**
- `ProfileManagers: DoubleMap<ProfileId, AccountId, (BitFlags<ManagerScope>, Option<BlockNumber>)>`
- `ManagerExpiries: Map<BlockNumber, BoundedVec<(ProfileId, AccountId)>>`

**Complejidad:** 3/5.

---

### B. Open Actions cross-chain — XCM v5 `Transact`

**Inspiración Lens:** Open Actions V2 (módulos arbitrarios).

**Custom Origin:**
```rust
Origin::OpenAction { publication: PubId, actor: MultiLocation, module: ModuleId, payload_hash: H256 }
```

**Guard:** `EnsureOpenAction` acepta `Signed(local)` **o** `AccountId32` derivado de XCM `DescendOrigin`.

**Primitivo Polkadot:** XCM v5 — `Transact` + `DescendOrigin` + `ExecuteWithOrigin`. Sibling parachain manda `Transact { call: execute_open_action(...) }` → barrier mapea sovereign account → origin `OpenAction`.

**Extrinsics:**
- `register_action_module(module_id, config_hash)` — governance-gated
- `enable_action_on_publication(pub_id, module_id, params)`
- `execute_open_action(pub_id, module_id, payload)` — XCM-callable
- `set_action_allowlist(pub_id, allowlist: BoundedVec<MultiLocation>)`

**Storage:**
- `PublicationActions: DoubleMap<PubId, ModuleId, ActionConfig>`
- `ActionNonce: Map<(PubId, ModuleId, MultiLocation), u64>` — anti-replay

**Demo:** desde Asset Hub un usuario colecciona un post; el NFT mintea allá, royalties vuelven por XCM.

**Complejidad:** 5/5.

---

### C. Sponsored / Gasless — `TransactionExtension` custom

**Inspiración Lens:** V3 Sponsorships.

**Custom Origin:**
```rust
Origin::Sponsored { sponsor: AccountId, user: AccountId, app: AppId, budget_remaining: Balance }
```

**Guard:** `EnsureSponsored` se aplica después de que la extension reescribe el origin en `pre_dispatch`.

**Primitivo Polkadot:** `TransactionExtension` pipeline v2 (stable2409+). Custom `ChargeSponsored(AppId)` implementa:
```rust
impl TransactionExtension<Call> for ChargeSponsored<T> {
    fn validate(&self, who, call, ...) -> TransactionValidity { /* budget + allowlist + nonce */ }
    fn prepare(..) { /* reescribe origin → Sponsored */ }
}
```

**Extrinsics:**
- `register_sponsor_app(app_id, daily_budget, allowed_calls)`
- `submit_sponsored(user_sig, call, nonce)`
- `top_up_sponsor(app_id, amount)`
- `pause_sponsorship(app_id, reason)`

**Storage:**
- `AppSponsorBudgets: Map<AppId, BudgetState>`
- `UserNonces: DoubleMap<AppId, AccountId, u64>`
- `DailyRefills: Map<BlockNumber, BoundedVec<AppId>>`

**Demo:** wallet con 0 DOT postea, sigue, colecciona. Dashboard del app muestra budget bajando en real-time.

**Complejidad:** 5/5.

---

### D. Multi-grafo — Instanced pallets

**Inspiración Lens:** V3 Graphs como primitivos deployables.

**Custom Origin:**
```rust
GraphOrigin<T: Config<I>, I: 'static = ()> {
    GraphOwner,
    Follower { follower: AccountId, followee: AccountId },
    GraphModerator(AccountId),
}
```

**Primitivo Polkadot:** `pallet::Pallet<T, I = ()>`. En `construct_runtime!`:
```rust
Graph: pallet_graph::<Instance1>,
WorkGraph: pallet_graph::<Instance2>,
AnonGraph: pallet_graph::<Instance3>,
```

**Extrinsics (por instance):**
- `follow<I>(target, gate_witness)`
- `unfollow<I>(target)`
- `set_follow_module<I>(profile, gate_config)`
- `migrate_follow<I, J>(target)`

**Storage (por instance):** `Follows`, `FollowGates`, `EdgeCount`, `Blocked`.

**Demo:** mismo account, dos grafos con reglas distintas (Pro requiere identity, Anon no). Type-safety del compilador impide cruzar.

**Complejidad:** 4/5.

---

### E. Verified Handle — XCM v5 `AuthorizedAliasers`

**Inspiración Lens:** verified handles / blue check.

**Custom Origin:**
```rust
SocialOrigin::PeopleVerified { account: AccountId, judgement: Judgement, issued_at: BlockNumber }
```

**Guard:** `EnsurePeopleVerified<MinJudgement: Get<Judgement>>` checa `judgement >= MinJudgement::get()` AND `issued_at` dentro de `MaxAge`.

**Primitivo Polkadot:** XCMv5 `AuthorizedAliasers`. People Chain puede invocar `sync_judgement` sobre nuestra chain como si fuera local origin.

**Extrinsics:**
- `sync_judgement(account, judgement)` — Origin::Xcm(people_chain)
- `refresh_judgement(account)` — dispara XCM query
- `invalidate(account)` — self-invalidation o Root

**Storage:**
- `PeopleCache: Map<AccountId, CachedJudgement { judgement, issued_at, expires_at, registrar }>`
- `AuthorizedAliasers: BoundedVec<Location, 4>`
- `RegistrarAllowlist: Map<RegistrarIndex, bool>`

**Demo:** identity `KnownGood` en People Chain; `refresh_judgement` en nuestra chain hace round-trip XCM; usuario pasa gate de "verified-only feed" que antes lo rechazaba.

**Complejidad:** 4/5.

---

### F. Whisper / DA off-chain — `pallet-statement` (Statement Store)

**Inspiración Lens:** Momoka (Polygon centralizada).

**Custom Origin:**
```rust
SocialOrigin::StatementAuthor { author: AccountId, topic: [u8;32], statement_hash: H256 }
```

**Guard:** minteado en `on_initialize` cuando OCW valida firma de un statement gossipeado.

**Primitivo Polkadot:** `pallet-statement` (ya habilitado en el runtime) + `offchain_worker`. Statements gossipeados con prioridad escalada por balance, firmas verificadas por el nodo nativo.

**Extrinsics:**
- `promote_to_onchain_post(statement_hash)` — sube un statement a post on-chain
- `ingest_collect_intent(statement_hash)` — colecciona refiriendo a statement

**Storage:**
- `KnownStatements: Map<H256, StatementMeta>`
- `TopicSubscriptions: Map<[u8;32], BoundedVec<AccountId>>`

**Demo:** 200 replies en 10 segundos, cero extrinsics; sólo al tipear "tip this reply 1 DOT" se dispara uno.

**Complejidad:** 4/5.

---

### G. Courtroom / Moderación — `pallet-referenda` custom track

**Inspiración Lens:** Rules Engine + appeals.

**Custom Origin:**
```rust
Origin::CommunityModerated { post_id: PostId, referendum_index: u32 }
```

**Guard:** sólo lifts cuando referendum de `Track::Moderation` pasa.

**Primitivo Polkadot:** `pallet-referenda` con track custom (curva agresiva, deposit bajo, super-mayoría), `pallet-ranked-collective` como Trust & Safety Fellowship (submitter whitelist), `pallet-statement` para evidencia.

**Extrinsics:**
- `flag_content(content_id, reason, evidence_statement: H256)`
- `submit_moderation_proposal(track, content_id, verdict)`
- `execute_verdict(referendum_index)`
- `appeal_verdict(content_id)` — escala a track más alto

**Storage:**
- `ContentVerdicts: Map<ContentId, VerdictHistory>`
- `ModerationDeposits: Map<AccountId, Balance>`
- `FlaggerReputation: Map<AccountId, FlagStats>`

**Demo:** admin trata de borrar post y falla. Referendum corre 5 min, 3 Fellows votan aye, scheduler ejecuta, post redacta en UI.

**Complejidad:** 4/5.

---

### H. Mirror Referral Split — `pallet-scheduler` + `on_idle`

**Inspiración Lens:** Mirror/Quote con referral revenue.

**Custom Origin:**
```rust
Origin::ReferralClaim { mirror_chain: BoundedVec<ProfileId, 8>, terminal_collect: CollectId }
```

**Guard:** `EnsureReferralClaim` camina la cadena, valida firmas/records, computa split decaying (50%/25%/12.5%…).

**Primitivo Polkadot:** `pallet-scheduler::schedule_named` para payouts diferidos + `on_idle` para pruning.

**Extrinsics:**
- `mirror(original_pub, referral_profile)`
- `quote(original_pub, new_content_cid, referral_profile)`
- `claim_referral_rewards(mirror_chain_proof)`
- `set_referral_curve(curve)` — governance

**Storage:**
- `MirrorChains: Map<PubId, BoundedVec<MirrorHop, 8>>`
- `PendingReferralPayouts: Map<BlockNumber, BoundedVec<Payout>>`
- `ReferralEarnings: Map<ProfileId, Balance>`

**Seguridad:** bounded depth evita viral-mirror-storm DoS; dispatchable es O(1) porque origin lleva la prueba.

**Complejidad:** 4/5.

---

### I. Phoenix — `pallet-recovery` + `pallet-society`

**Inspiración Lens:** transferencia de Profile NFT (problema @stani de $500k).

**Custom Origin:**
```rust
Origin::RecoveredProfile { profile_id: ProfileId, new_owner: AccountId, recovery_round: u32 }
```

**Guard:** `EnsureRecoveredProfile` sólo lifts cuando `pallet-recovery` confirma threshold-of-N friends.

**Primitivo Polkadot:** `pallet-recovery` (M-of-N social recovery) + `pallet-society` para reputación de guardianes.

**Extrinsics:**
- `configure_profile_recovery(profile, guardians, threshold, delay)`
- `initiate_profile_recovery(profile, claimant)`
- `vouch_profile_recovery(profile, claimant)`
- `claim_recovered_profile(profile)` — lift origin, rotate ownership, revoke managers, rotate IPFS signing key

**Storage:**
- `ProfileRecoveryConfig: Map<ProfileId, RecoveryConfig>`
- `ActiveRecoveries: Map<ProfileId, RecoveryState>`

**Demo:** presenter "pierde" keys, tres amigos firman, delay fast-forwarded, nuevo key controla `@presenter` con 12k followers intactos.

**Complejidad:** 3/5.

---

### J. Collect con escrow — `MutateHold` + `HoldReason` + pre-signed mints

**Inspiración Lens:** Collect Modules (paid, splits, editions).

**Custom Origin:**
```rust
Origin::Collector { collector: AccountId, publication: PubId, edition: u64, paid: Balance }
```

**Guard:** `EnsureCollected` lifts sólo después de hold exitoso bajo `HoldReason::Collect { pub_id }` y splits computados.

**Primitivo Polkadot:** `fungible::MutateHold` con `#[pallet::composite_enum] HoldReason` + `pallet-nfts` pre-signed mints (voucher firmado off-chain).

**Extrinsics:**
- `set_collect_module(pub_id, CollectConfig { price, asset, limit, referral_bps, window })`
- `collect(pub_id, referrer: Option<ProfileId>, voucher: PreSignedMint)`
- `finalize_collect_window(pub_id)` — scheduled
- `reclaim_unsold_holds(pub_id)`

**Storage:**
- `CollectConfigs: Map<PubId, CollectConfig>`
- `CollectHolds: DoubleMap<PubId, AccountId, Balance>`

**Demo:** creator offline (airplane mode); collector escanea QR del voucher, mintea. Creator sigue offline.

**Complejidad:** 4/5.

---

### K. Flash Collect — `pallet-broker` / Coretime

**Inspiración Lens:** drops virales que saturan gas.

**Custom Origin:**
```rust
Origin::CollectHost { publication: PubId, region_id: RegionId, expires_at: BlockNumber }
```

**Guard:** minteado cuando creator deposita + coretime region asignada.

**Primitivo Polkadot:** `pallet-broker` — regions, cores, CoreMask (1/80). Creator pre-compra región (~1h de blockspace dedicado).

**Extrinsics:**
- `buy_flash_region(pub_id, region_spec)`
- `activate_flash_region(pub_id)` — tras purchase
- `open_collect_flash_sale(pub_id)`
- `release_region(pub_id)`

**Storage:**
- `FlashRegions: Map<PubId, FlashRegionState>`
- `RegionRegistrar: Map<RegionId, PubId>`

**Demo:** split-screen. Sin core: 10/sec collects fallan. Con core comprado: 200/sec éxito.

**Complejidad:** 5/5.

---

### L. Passkey login — `pallet-verify-signature` tx-ext

**Inspiración Lens:** social login sin seed phrase.

**Custom Origin:**
```rust
Origin::PasskeyAuth { device_id: H256, account: AccountId }
```

**Guard:** `EnsurePasskeyAuth` acepta origin sólo si `pallet-verify-signature` validó firma WebAuthn/P256 sobre el call.

**Primitivo Polkadot:** `pallet-verify-signature` como transaction extension — valida firmas alt (Ed25519, Sr25519, ECDSA, **P256/WebAuthn**) sobre el call hash.

**Extrinsics:**
- `register_passkey(device_id, pubkey)`
- `revoke_passkey(device_id)`
- Todos los extrinsics sociales aceptan `Origin::PasskeyAuth` como alternativa a `Signed`.

**Storage:**
- `Passkeys: DoubleMap<AccountId, DeviceId, PasskeyInfo>`

**Demo:** login con Touch ID/Face ID desde el browser; no seed, no wallet extension.

**Complejidad:** 4/5.

---

## 6. Combos recomendados

### Combo "Breadth maxi" — 4 features, 4 primitivos radicalmente distintos

**A + B + C + F**

| Feature | Primitivo único |
|---|---|
| A. Profile Manager | `pallet-proxy` custom ProxyType |
| B. Open Actions XCM | XCM v5 Transact |
| C. Sponsored | TransactionExtension custom |
| F. Whisper | Statement Store |

**Cobertura:** delegación, cross-chain, fees/signed extensions, DA off-chain. Cuatro áreas del SDK radicalmente distintas.

### Combo "Gobernanza + Interop" — 3 features

**E + G + I**

| Feature | Primitivo único |
|---|---|
| E. People-Verified | XCM AuthorizedAliasers |
| G. Courtroom | Referenda custom track |
| I. Phoenix | pallet-recovery + society |

**Cobertura:** parachain-a-parachain, governance tracks, account recovery. Perfecto si el jurado valora "institutional Polkadot".

### Combo "El jurado no volvió a casa" — 3 features, el máximo tech

**B + C + K**

| Feature | Primitivo único |
|---|---|
| B. Open Actions XCM | XCM v5 |
| C. Sponsored | TransactionExtension |
| K. Flash Collect | Coretime/pallet-broker |

**Cobertura:** tres cosas que **literalmente no existen en Ethereum**. Coretime es el killer — ningún L2 lo tiene.

### Combo "Storage + Ejecución diferida" — 3 features

**H + J + D**

| Feature | Primitivo único |
|---|---|
| H. Mirror Referral | Scheduler + on_idle |
| J. Collect Hold | HoldReason + NFT pre-signed |
| D. Multi-grafo | Instanced pallets |

**Cobertura:** hooks de runtime, fungible traits modernos, generic instancing. FRAME-específico.

---

## 7. Cómo elegir (criterio anti-solape)

Para cada feature preguntate:

1. **¿Qué trait/pallet/macro del SDK toca que las otras no tocan?**
   Si la respuesta es "ninguno único" → es ruido, descartar.

2. **¿La custom origin es vehículo natural o está forzada?**
   Una origin que sólo envuelve `Signed` no demuestra nada. Debe nacer de algo (XCM, scheduler, referenda, tx-ext, recovery).

3. **¿El primitivo está del lado runtime, cliente, o interop?**
   Un buen slate tiene **al menos uno de cada**:
   - **Runtime interno**: pallet-proxy, scheduler, hold, instanced, on_idle.
   - **Cliente/tx**: transaction extension, verify-signature, meta-tx.
   - **Interop**: XCM Transact, AuthorizedAliasers, pallet-broker.

### Recomendación final

- **2-3 días**: `A + C + B` (proxy / tx-ext / XCM). Runtime, cliente, interop. Demo unificado.
- **Fin de semana extendido**: agregá `F` (Statement Store) — ya está en el runtime, "gratis".
- **Máximo wow**: `B + C + K` — las tres cosas que nadie en Ethereum puede replicar.

---

## 8. Polkadot vs Lens: tabla comparativa

| Feature de Lens | Hack/workaround en EVM | Solución Polkadot native |
|---|---|---|
| Profile Manager | Contratos custom + signature schemes | `pallet-proxy` + `InstanceFilter` |
| Sponsorships / gasless | Gelato + ERC-2771 (forwarder confiable) | `TransactionExtension` en runtime |
| Open Actions cross-chain | Oráculos | XCM v5 `Transact` |
| Momoka (DA) | Polygon centralizada por Lens Labs | `pallet-statement` (todos los validadores) |
| Multi-Graph V3 | Deploy de N contratos sin type-safety | `pallet::Instance*` |
| Moderación | Multisig de la empresa | `pallet-referenda` con tracks |
| Identity verificada | Worldcoin + bridges | XCM a People Chain |
| Recovery del handle | No existe | `pallet-recovery` |
| Flash collect / drops | Gas war, usuarios pierden | `pallet-broker` / Coretime |
| Login gasless | Biconomy / trusted forwarder | `pallet-verify-signature` (WebAuthn nativo) |
| Collect NFT | ERC-721 per-publication | `pallet-nfts` pre-signed mints + HoldReason |

---

## Fuentes consultadas

- [Lens Social Protocol Docs](https://lens.xyz/docs/protocol)
- [Introducing the New Lens (V3)](https://lens.xyz/news/introducing-the-new-lens)
- [lens-protocol/lens-v3 GitHub](https://github.com/lens-protocol/lens-v3)
- [Lens Modules GitHub](https://github.com/lens-protocol/modules)
- [Profile Manager Docs](https://www.lens.xyz/docs/primitives/profile/manager)
- [Open Actions Docs](https://www.lens.xyz/docs/concepts/open-actions)
- [Sponsored Transactions Docs](https://www.lens.xyz/docs/best-practices/gasless/sponsored-transactions)
- [FRAME origin reference](https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/reference_docs/frame_origin/index.html)
- [pallet::origin macro](https://paritytech.github.io/polkadot-sdk/master/frame_support/pallet_macros/attr.origin.html)
- [pallet-referenda](https://paritytech.github.io/polkadot-sdk/master/pallet_referenda/index.html)
- [pallet-proxy](https://paritytech.github.io/polkadot-sdk/master/pallet_proxy/index.html)
- [pallet-nfts](https://paritytech.github.io/polkadot-sdk/master/pallet_nfts/index.html)
- [pallet-statement](https://paritytech.github.io/polkadot-sdk/master/pallet_statement/index.html)
- [pallet-verify-signature](https://paritytech.github.io/polkadot-sdk/master/pallet_verify_signature/index.html)
- [pallet-meta-tx](https://paritytech.github.io/polkadot-sdk/master/pallet_meta_tx/index.html)
- [pallet-broker (Coretime)](https://paritytech.github.io/polkadot-sdk/master/pallet_broker/index.html)
- [pallet-recovery](https://paritytech.github.io/polkadot-sdk/master/pallet_recovery/index.html)
- [People Chain Docs](https://docs.polkadot.com/polkadot-protocol/architecture/system-chains/people/)

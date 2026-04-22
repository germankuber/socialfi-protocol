<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img src="./assets/logo-light.png" alt="Polkadot Stack Template" width="220" />
  </picture>
</p>

# Architecture Overview

Canonical deep-dive for the whole stack. Assumes you have seen the root `README.md` diagram; this doc explains **how the pieces talk, what lives where, and which invariants they uphold**.

## 10-second mental model

- **Chain**: parachain runtime embedding the FRAME social pallets plus `pallet-statement`, run inside a **collator**.
- **On-chain**: profiles, posts, follow edges, app registry, fee pots, encrypted capsules, moderation records.
- **Off-chain**: post bodies (IPFS), real-time notifications (Statement Store gossip), capsule unlocks (OCW + external key service), denormalised views (local indexer).
- Clients talk RPC: PAPI from the browser, subxt from the CLI.

## Top-down component map

The frontend opens **two PAPI connections in parallel**: one to this chain for SocialFi data, one to **Polkadot People** for identity. The same sr25519 keypair signs against either chain.

```mermaid
graph TB
    subgraph Clients["👥 Clients"]
        Web["web/<br/>React + Vite + PAPI"]
        CLI["cli/<br/>Rust + subxt"]
        Wallets["Browser wallets<br/>Polkadot.js · Talisman · SubWallet · Host"]
    end

    subgraph Services["🔌 Off-chain services"]
        Indexer["indexer/<br/>TypeScript + lowdb"]
        IPFS[("IPFS<br/>post bodies")]
    end

    subgraph Node["🖥️ SocialFi collator"]
        RPC["RPC endpoints<br/>9944 Substrate WS"]
        Runtime["WASM runtime<br/>stack-template-runtime<br/>(hosts SocialFi pallets)"]
        OCW["Offchain workers<br/>per-pallet hooks"]
        SS["Statement Store<br/>gossip + TTL"]
    end

    subgraph People["🪪 Polkadot People parachain"]
        PeopleRPC["People RPC<br/>VITE_PEOPLE_WS_URL"]
        PalletIdentity["pallet-identity<br/>(display name, judgement,<br/>username)"]
        PeopleRPC --> PalletIdentity
    end

    Web -->|PAPI WS| RPC
    Web -->|PAPI WS · read + write| PeopleRPC
    Wallets -.signs.-> Web
    Web -->|HTTP| Indexer
    Web -->|JSON-RPC| SS
    Web -->|multiaddr| IPFS

    CLI -->|subxt WS| RPC

    Indexer -->|PAPI WS| RPC

    RPC --> Runtime
    Runtime --> OCW
    OCW --> SS

    classDef chain fill:#1e293b,color:#e2e8f0,stroke:#475569
    classDef people fill:#4c1d95,color:#ede9fe,stroke:#a78bfa
    classDef offchain fill:#075985,color:#e0f2fe,stroke:#0284c7
    classDef client fill:#1e3a8a,color:#dbeafe,stroke:#3b82f6
    class RPC,Runtime,OCW,SS chain
    class PeopleRPC,PalletIdentity people
    class Indexer,IPFS offchain
    class Web,CLI,Wallets client
```

### Pallet zoom-in

```mermaid
graph TB
    subgraph Runtime["🧩 stack-template-runtime"]
        direction TB

        subgraph Social["SocialFi pallets"]
            Registry[social-app-registry<br/>idx 51]
            Profiles[social-profiles<br/>idx 52]
            Graph[social-graph<br/>idx 53]
            Feeds[social-feeds<br/>idx 54]
            Managers[social-managers<br/>idx 55]
            Sponsor[sponsorship<br/>idx 56]
        end

        subgraph Shared["Shared primitives"]
            NotifPrim["social-notifications-primitives<br/>(build_statement, topics)"]
        end

        subgraph Infra["Infrastructure pallets"]
            Statement[pallet-statement<br/>idx 40]
        end

        Registry -->|AppProvider| Feeds
        Profiles -->|ProfileProvider| Feeds
        Profiles -->|ProfileProvider| Graph
        Registry -.EnsureAppModerator.-> Feeds
        Managers -.scoped origin.-> Feeds
        Managers -.scoped origin.-> Graph
        Managers -.scoped origin.-> Profiles
        Sponsor -.ChargeSponsored TxExt.-> Social

        Feeds --> NotifPrim
        Graph --> NotifPrim
        Registry --> NotifPrim
        NotifPrim -->|NotificationSubmitter adapter| Statement
    end

    classDef social fill:#1e3a8a,color:#dbeafe,stroke:#3b82f6
    classDef shared fill:#7c2d12,color:#fed7aa,stroke:#ea580c
    classDef infra fill:#1e293b,color:#e2e8f0,stroke:#475569
    class Registry,Profiles,Graph,Feeds,Managers,Sponsor social
    class NotifPrim shared
    class Statement infra
```

Pallet indices above are pinned in `construct_runtime!` and not re-listed elsewhere in this doc.

---

## Layer by layer

### 1. Pallets (on-chain business logic)

Each pallet is a single-responsibility FRAME module owning a storage domain; extrinsic lists live in each pallet's `lib.rs` under `blockchain/pallets/`. Cross-pallet wiring (per diagram): `social-feeds` consumes `AppProvider` from the registry and `ProfileProvider` from profiles; `social-managers` injects a synthetic scoped origin into feeds/graph/profiles; `sponsorship` attaches as a `TransactionExtension` over all social extrinsics. Shared notification helpers live in `blockchain/primitives/social-notifications/`.

### 2. Runtime (the WASM blob)

`blockchain/runtime/` composes pallets into `construct_runtime!`, wires Configs, defines runtime APIs (including `ValidateStatement`), and emits the WASM the collator executes. It also owns cross-pallet adapters — notably `NotificationStatementSubmitter`, which bridges social pallets to `pallet-statement` so no social pallet depends on statement-store directly.

### 3. Offchain workers (OCW)

OCWs run **after each imported block, off the consensus path**, and can call host functions unavailable in dispatch (HTTP, local storage, signing). Two run today:

- **`pallet-statement` OCW** — scans events for `NewStatement`, attaches `Proof::OnChain`, hands off to the Statement Store.
- **`social-feeds` OCW** (`src/offchain.rs`) — processes pending capsule unlocks by calling an **external Key Service** sidecar that custodies the X25519 keypair; the service opens the capsule, re-seals the content key to the viewer's ephemeral public key, and signs. The OCW then submits `deliver_unlock_unsigned`. In-repo code ships a dev stub (`dev_key.rs`) that inlines this into the collator; production moves it behind the external service.

### 4. Collator node

Polkadot-parachain-compatible binary, built by `docker/Dockerfile.node`. Exposes **9944** (Substrate JSON-RPC over WS — PAPI, subxt, Statement Store) and **30333** (libp2p). Statement Store gossip rides libp2p separately from block gossip.

### 5. Statement Store

Off-chain, signed, TTL-bounded pub/sub riding libp2p. Statements **never enter a block** — they gossip between nodes. Each carries up to 4 topics (we use two: app namespace + routing key) plus a JSON payload for cross-language portability. Clients subscribe via `statement_subscribeStatement(TopicFilter)` for WebSocket push.

### 6. Off-chain services

- **`indexer/`** — TypeScript (Express + lowdb), subscribes via PAPI, denormalises events into JSON, exposes `/api/events`, `/api/txs-by-address`, `/api/earnings/:post_id`. Non-authoritative query acceleration; localhost-only.
- **IPFS** — stores post bodies and profile metadata; the chain holds only CIDs.

### 7. Clients

- **`web/`** — React 18 + Vite + Tailwind + PAPI + zustand. Connects wallets, renders the feed, submits extrinsics, subscribes to notifications.
- **`cli/`** — Rust binary on subxt + clap. Chain info + Statement Store submit/dump; used by smoke tests.

### 8. Wallets

Three entry points, normalised behind a single `WalletAccount` store entry:

| Wallet | Transport | Where it runs |
|---|---|---|
| Polkadot.js / SubWallet / Talisman | Browser extension API | Browser |
| Polkadot Host | `@novasamatech/product-sdk` | Container (desktop/mobile) |
| Dev-mode seeds | HDKD in-memory | Browser (dev only) |

### 9. Notifications

Real-time header bell, no polling. Design choice: **no social pallet depends on `pallet-statement` directly** — pallets emit through `social-notifications-primitives::build_statement` and the runtime's `NotificationStatementSubmitter` adapter forwards to `pallet-statement`, keeping pallets reusable outside this runtime. Sequence: [`NOTIFICATIONS_FLOW.md`](./NOTIFICATIONS_FLOW.md); topic + payload contract: [`NOTIFICATIONS_TOPICS.md`](./NOTIFICATIONS_TOPICS.md).

### 10. Identity (Polkadot People parachain)

Display names, websites, social handles and registrar judgements live on the **Polkadot People system parachain**, not on this chain — the protocol piggybacks on identity users already hold across Polkadot UIs. The frontend opens a second PAPI connection to `VITE_PEOPLE_WS_URL`; `useIdentity(address)` reads `Identity.IdentityOf` and surfaces a three-state badge (`verified` / `pending` / `none`). `<IdentityPanel />` submits `set_identity` / `request_judgement` / `clear_identity` directly to People using the same sr25519 keypair (user needs DOT on People for the deposit). `pallet-social-profiles` remains source of truth for SocialFi-specific data (metadata CID + follow fee). Identity is universal; profile is app-specific.

---

## Typical request paths

### Reading the home feed

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Web as web/
    participant PAPI as PAPI client
    participant RPC as Node RPC :9944
    participant Runtime
    participant Indexer

    User->>Web: Opens /social/feed
    Web->>PAPI: api.query.SocialFeeds.PostsTimeline.iter(...)
    PAPI->>RPC: state_getKeysPaged + state_getStorage
    RPC->>Runtime: runtime_api::state_getStorage
    Runtime-->>RPC: raw SCALE bytes
    RPC-->>PAPI: response
    PAPI-->>Web: typed PostInfo[]
    Web->>Indexer: GET /api/earnings/:post (optional)
    Indexer-->>Web: { total, topAuthor }
    Web-->>User: renders feed
```

Reads hit the chain directly for canonical data; the indexer is only consulted for denormalised views (earnings rollups, timeline-by-address). PAPI generates typed descriptors from runtime metadata (`web/.papi/`), so every storage read is type-safe at the browser.

### Posting an encrypted reply with sponsored fees

```mermaid
sequenceDiagram
    autonumber
    participant Alice
    participant Web
    participant Wallet as Wallet (extension)
    participant TxExt as ChargeSponsored<br/>(TransactionExtension)
    participant PFeeds as pallet-social-feeds
    participant PSponsor as pallet-sponsorship
    participant PStatement as pallet-statement
    participant OCW as feeds OCW
    participant KeyService as key-service<br/>(external)
    participant Bob

    Alice->>Web: Writes reply + attaches encrypted capsule
    Web->>Wallet: sign create_reply(...)
    Wallet-->>Web: signed extrinsic
    Web->>TxExt: include in signed tx
    TxExt->>PSponsor: resolve_sponsor(Alice, fee)?
    PSponsor-->>TxExt: Some(sponsor) — pot funded
    TxExt->>PSponsor: settle_sponsorship(sponsor, _, fee)
    TxExt->>PFeeds: dispatch create_reply
    PFeeds->>PFeeds: validate, store PostInfo
    PFeeds->>PStatement: submit_statement(Alice, notif{kind=reply, recipient=Bob})
    PFeeds-->>Alice: Ok
    Note over PStatement,OCW: Block imported
    PStatement->>PStatement: offchain_worker: attach Proof::OnChain
    PStatement-->>Bob: Statement Store push (Bob subscribed to his recipient topic)
    Bob->>Bob: bell +1

    Note over OCW,KeyService: If reply had its own capsule later unlocked by a viewer
    OCW->>KeyService: open(capsule) + sign (external sidecar)
    KeyService-->>OCW: content_key + signature
    OCW->>PFeeds: deliver_unlock_unsigned(viewer_key)
```

Alice pays nothing: `ChargeSponsored` redirects the fee to a sponsor pot before `ChargeTransactionPayment` ever charges her. Notifications are emitted indirectly via `build_statement` — no pallet touches statement-store by hand. The Key Service sidecar is the same decision as §3: capsule decryption does not live in the collator process.

---

## Deployment topology

```mermaid
graph LR
    Users["Users (browsers)"]
    Wallet["Wallet extension"]
    WebCDN["web/ static build<br/>(Cloudflare Pages · Vercel)"]

    subgraph Edge["Edge"]
        IPFSGW["IPFS gateway<br/>(Paseo or self-hosted)"]
    end

    subgraph RPCLayer["SocialFi RPC"]
        RPC1["Collator A<br/>RPC :9944"]
        RPC2["Collator B<br/>RPC :9944"]
    end

    subgraph Backend["Backend services (optional)"]
        IndexerProd["Indexer<br/>express + postgres"]
    end

    subgraph Chain["SocialFi parachain"]
        Para["Collators A..N"]
        Relay["Polkadot / Paseo relay"]
    end

    subgraph PeopleEcosystem["Polkadot People parachain"]
        PeopleRPC["wss://polkadot-people-<br/>rpc.polkadot.io"]
        PeopleCollators["Parity / public<br/>People collators"]
        PeopleRPC --> PeopleCollators
        PeopleCollators --> Relay
    end

    Users --> WebCDN
    WebCDN -.PAPI WS.-> RPC1
    WebCDN -.PAPI WS.-> PeopleRPC
    WebCDN -.HTTP.-> IPFSGW
    WebCDN -.HTTP.-> IndexerProd
    Wallet -.signs.-> WebCDN
    IndexerProd -.PAPI WS.-> RPC2
    RPC1 --> Para
    RPC2 --> Para
    Para --> Relay
```

The repo ships single-node docker-compose and zombienet configs for multi-collator testing — neither is a production topology. Real deploys add a relay chain, multiple collators, RPC load balancers and observability, but every moving part is already in source.

---

## Known rough edges

- **Encryption key management** — the X25519 secret used by the feeds OCW is a compile-time constant (`dev_key::DEV_SEED`); anyone with the WASM can decrypt every capsule. Migration plan: keystore-backed loading, dev falls back behind a feature flag. The external Key Service sidecar in the diagrams is the target endpoint.
- **Indexer is single-node** — fine for dev, needs Postgres + a job runner for production.
- **Sponsorship fee calculation** ignores `proof_size` and length fees (MVP limitation, documented in `extension.rs`).
- **Deployment addresses in a JSON file** — racy under parallel env deploys.

---

## Where to go next

- [`INSTALL.md`](./INSTALL.md) — local setup.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — production-lite deployment.
- [`ENCRYPTED_POSTS_WORKFLOW.md`](./ENCRYPTED_POSTS_WORKFLOW.md) — single encrypted unlock, end to end.
- [`NOTIFICATIONS_FLOW.md`](./NOTIFICATIONS_FLOW.md) — notification sequence.
- [`NOTIFICATIONS_TOPICS.md`](./NOTIFICATIONS_TOPICS.md) — topic + payload contract.

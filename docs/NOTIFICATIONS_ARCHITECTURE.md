<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img src="./assets/logo-light.png" alt="Polkadot Stack Template" width="220" />
  </picture>
</p>

# Real-Time Notifications — Architecture

High-level view of how SocialFi pallets surface live notifications
through the Substrate Statement Store and the Parity-published
`@polkadot-apps/statement-store` client.

Three events today produce notifications:

- `pallet-social-feeds::create_reply` → direct notification to the
  parent post's author (skipped on self-reply).
- `pallet-social-graph::follow` → direct notification to the followed
  account.
- `pallet-social-app-registry::register_app` → broadcast to every
  subscriber on the `broadcast/new-app` topic.

No new pallet, no authority key, no extra offchain worker: we reuse
`pallet-statement`'s existing OCW to attach `Proof::OnChain` and
gossip the statement across the network.

## Component map

```mermaid
graph TB
    subgraph Browser["🌐 Browser (web/)"]
        Bell["NotificationsBell<br/>(header component)"]
        UseNotif["useNotifications hook"]
        SSClient["StatementStoreClient<br/>@polkadot-apps/statement-store"]
        Bell --> UseNotif
        UseNotif --> SSClient
    end

    subgraph Chain["⛓️ Parachain Node"]
        subgraph Pallets["Runtime pallets"]
            Feeds["pallet-social-feeds<br/>create_reply"]
            Registry["pallet-social-app-registry<br/>register_app"]
            SocialGraph["pallet-social-graph<br/>follow"]
        end

        Adapter["NotificationStatementSubmitter<br/>(runtime adapter)"]
        Primitives["social-notifications-primitives<br/>build_statement + topics"]
        PStatement["pallet-statement<br/>submit_statement + OCW"]

        subgraph SS["Statement Store"]
            Store[("Store + gossip P2P<br/>TTL, topics, proof")]
        end

        Feeds --> Primitives
        Registry --> Primitives
        SocialGraph --> Primitives
        Primitives --> Adapter
        Adapter --> PStatement
        PStatement -->|"attaches Proof::OnChain"| Store
    end

    Store -.->|"statement_subscribeStatement<br/>WebSocket push"| SSClient

    classDef backend fill:#1e293b,color:#e2e8f0,stroke:#475569
    classDef frontend fill:#1e3a8a,color:#dbeafe,stroke:#3b82f6
    classDef store fill:#581c87,color:#f3e8ff,stroke:#a855f7
    class Feeds,Registry,SocialGraph,Adapter,Primitives,PStatement backend
    class Bell,UseNotif,SSClient frontend
    class Store store
```

## Why this layout

- **`social-notifications-primitives`** is a `no_std` crate shared by
  every producing pallet. It owns the topic derivation logic, the
  JSON payload shape, and the `StatementSubmitter` trait. Pallets
  stay decoupled from `pallet-statement` itself — their mocks plug in
  `()` and ignore notifications during unit tests.
- **`NotificationStatementSubmitter`** lives in the runtime
  (`blockchain/runtime/src/configs/mod.rs`). It is a one-line adapter
  that forwards to `pallet_statement::Pallet::<Runtime>::submit_statement`.
  Keeping it in the runtime — not in each pallet — means every pallet
  is free of a hard dependency on `pallet-statement`.
- **`pallet-statement`'s OCW** is what actually hits the Statement
  Store host function. It scans `NewStatement` events per block,
  attaches `Proof::OnChain { who, block_hash, event_index }`, and
  calls `sp_statement_store::runtime_api::statement_store::submit_statement`.
  We piggyback on that hook — no custom OCW, no authority key.
- **Browser subscribes** via WebSocket RPC (`statement_subscribeStatement`)
  wrapped by `@polkadot-apps/statement-store`. The library handles
  reconnect, polling fallback and topic filtering.

## Files introduced

- `blockchain/primitives/social-notifications/` — the new crate.
- `blockchain/runtime/src/configs/mod.rs` — `NotificationStatementSubmitter`
  adapter + Config wiring.
- `blockchain/pallets/{social-feeds,social-graph,social-app-registry}/src/lib.rs`
  — `type NotificationSubmitter` in Config plus one `build_statement +
  submit_statement` call per extrinsic.
- `web/src/hooks/social/useNotifications.ts` — React hook.
- `web/src/components/social/NotificationsBell.tsx` — header bell.

See also:

- [`NOTIFICATIONS_FLOW.md`](./NOTIFICATIONS_FLOW.md) — end-to-end
  sequence diagram.
- [`NOTIFICATIONS_TOPICS.md`](./NOTIFICATIONS_TOPICS.md) — exact topic
  layout shared between Rust and TypeScript.

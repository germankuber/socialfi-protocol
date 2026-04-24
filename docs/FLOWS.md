# Flows

Visual index of the four sequences that matter: runtime composition,
notifications, encrypted posts, and the notification topic contract.

## 1. Runtime composition

How the custom SocialFi pallets wire together inside the runtime.

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
    class Registry,Profiles,Graph,Feeds,Managers,Sponsor social
```

## 2. Real-time notifications — Alice follows Bob

A single notification from extrinsic dispatch to Bob's bell badge.
`create_reply` and `register_app` follow the same pattern with
different topics and payloads (see diagram 4).

```mermaid
sequenceDiagram
    autonumber
    participant Alice as Alice<br/>(browser/CLI)
    participant Graph as pallet-social-graph
    participant Prim as primitives::<br/>build_statement
    participant Adapter as NotificationStatementSubmitter
    participant PStmt as pallet-statement
    participant Store as Statement Store
    participant Bob as Bob<br/>(browser)

    Alice->>Graph: follow(target=Bob)
    Graph->>Graph: transfer fee<br/>update storage
    Graph->>Prim: build_statement(<br/>sender=Alice,<br/>recipient=Direct(Bob),<br/>kind=Follow,<br/>entity=Alice)
    Prim-->>Graph: Statement{<br/>topic[0]=APP_TOPIC,<br/>topic[1]=hash(hex(Bob)),<br/>data=JSON}
    Graph->>Adapter: T::NotificationSubmitter::<br/>submit_statement(Alice, stmt)
    Adapter->>PStmt: Pallet::<Runtime>::<br/>submit_statement(Alice, stmt)
    PStmt->>PStmt: deposit_event(NewStatement)
    Graph-->>Alice: Ok — Followed event

    Note over PStmt: offchain_worker<br/>reads events, wraps in<br/>Proof::OnChain
    PStmt->>Store: submit(stmt with proof)

    Note over Store: gossip P2P<br/>(no on-chain storage)

    Store-->>Bob: StatementEvent::NewStatements<br/>(matching topic[1])
    Bob->>Bob: JSON.parse(data)<br/>dedup + render bell badge
```

**Timing floor**: ~6 s end-to-end, dominated by block time. The
notification pipeline adds sub-200 ms.

## 3. Encrypted posts — publish and unlock

Three keys do all the work:

| Key | Algorithm | Purpose |
|---|---|---|
| `k_content` | XChaCha20-Poly1305 (32 B) | Encrypts the post body before IPFS upload |
| Key Service X25519 | `crypto_box_seal` | Wraps `k_content` into the on-chain capsule |
| Key Service sr25519 | `sr25519` | Signs `DeliverUnlockPayload` so the unsigned tx is accepted |

```mermaid
sequenceDiagram
    autonumber
    participant A as Author browser
    participant IPFS
    participant KS as Key Service
    participant Chain as social-feeds pallet
    participant OCW as Runtime OCW
    participant V as Viewer browser

    A->>A: generate k_content and encrypt body
    A->>IPFS: upload ciphertext blob
    A->>KS: fetch X25519 pubkey
    KS-->>A: pubkey
    A->>A: seal k_content with that pubkey
    A->>Chain: create_post with cid and capsule
    V->>V: generate ephemeral X25519 keypair
    V->>Chain: unlock_post with buyer_pk and fee
    Chain->>Chain: enqueue PendingUnlocks entry
    OCW->>Chain: read PendingUnlocks and capsule
    OCW->>KS: unseal capsule and re-seal to buyer_pk
    KS-->>OCW: wrapped_key and signature
    OCW->>Chain: deliver_unlock_unsigned with payload and signature
    Chain->>Chain: validate and fill wrapped_key
    V->>Chain: query Unlocks for post and viewer
    V->>IPFS: fetch ciphertext blob
    V->>V: unseal wrapped_key with buyer_sk and decrypt blob
```

Viewer pays `unlock_fee` in the same extrinsic that enqueues the
request — the OCW only observes entries that already paid. The
in-repo X25519 secret (`blockchain/pallets/social-feeds/src/dev_key.rs`)
is a **dev stub**; production runs an external Key Service.

## 4. Notification topic contract

How topics are derived on the Rust side and re-derived in the
frontend so subscriptions match exactly.

```mermaid
graph LR
    subgraph Rust["🦀 Rust (backend)"]
        R0["topic[0] = APP_TOPIC<br/>blake2_256(<br/>'stack-template-notifications')"]
        R1Direct["topic[1] (Direct)<br/>blake2_256(hex(account))"]
        R1Broadcast["topic[1] (Broadcast)<br/>blake2_256('broadcast/new-app')"]
        RPayload["data = JSON UTF-8<br/>{kind, sender, entity, block}"]
    end

    subgraph JS["📜 TypeScript (frontend)"]
        J0["new StatementStoreClient({<br/>appName: 'stack-template-notifications'<br/>})"]
        J1Direct["client.subscribe(cb,<br/>{topic2: hexAccountId})"]
        J1Broadcast["client.subscribe(cb,<br/>{topic2: 'broadcast/new-app'})"]
        JPayload["statement.data<br/>(already JSON-parsed by lib)"]
    end

    R0 -.->|"createTopic(appName)<br/>= blake2b_256(utf8)"| J0
    R1Direct -.->|"createTopic(topic2)"| J1Direct
    R1Broadcast -.->|"createTopic(topic2)"| J1Broadcast
    RPayload -.->|"bytes → JSON.parse"| JPayload

    classDef rust fill:#7c2d12,color:#fed7aa,stroke:#ea580c
    classDef js fill:#164e63,color:#cffafe,stroke:#06b6d4
    class R0,R1Direct,R1Broadcast,RPayload rust
    class J0,J1Direct,J1Broadcast,JPayload js
```

Direct notifications target a specific account; broadcast ones fan
out to anyone subscribed to the well-known tag (e.g. `broadcast/new-app`).

## 5. Sponsored transaction — beneficiary pays nothing

`ChargeSponsored` is a wrapper transaction extension. It runs
**before** the native `ChargeTransactionPayment`, detects whether
the signer has a funded sponsor, and — if so — tops up the
beneficiary from the sponsor's pot in the exact fee amount. The
inner extension then withdraws that fee, net zero on the beneficiary.

Setup (one-time, by the sponsor):

1. `top_up_pot(amount)` — sponsor transfers native balance into their
   `SponsorPots[sponsor]` entry.
2. `register_beneficiary(beneficiary)` — writes
   `SponsorOf[beneficiary] = sponsor`. One active sponsor per
   beneficiary.

Per-transaction flow:

```mermaid
sequenceDiagram
    autonumber
    participant Ben as Beneficiary<br/>(submits tx)
    participant Ext as ChargeSponsored<br/>(TxExtension wrapper)
    participant Pallet as pallet-sponsorship
    participant Inner as ChargeTransactionPayment<br/>(inner extension)
    participant Runtime as Runtime dispatch

    Ben->>Ext: signed extrinsic + expected fee
    Ext->>Pallet: resolve_sponsor(beneficiary, fee)
    alt sponsor funded & covers fee
        Pallet-->>Ext: Some(sponsor)
        Note over Ext: validate() returns<br/>Val::SponsorPay — skips<br/>inner can_withdraw_fee
        Ext->>Pallet: prepare() — debit pot<br/>transfer fee → beneficiary
        Pallet-->>Ext: PotWithdrawn + FeeSponsored events
        Ext->>Inner: prepare() (beneficiary now has fee)
        Inner->>Inner: withdraw_fee(beneficiary, fee)
        Inner-->>Ben: net 0 balance change
    else no sponsor / pot empty
        Pallet-->>Ext: None
        Note over Ext: validate() falls through<br/>to native path
        Ext->>Inner: validate() + prepare()
        Inner->>Inner: can_withdraw_fee(beneficiary)
        Inner-->>Ben: beneficiary pays normally
    end
    Runtime->>Runtime: dispatch call
    Note over Runtime: post_dispatch refunds<br/>unused weight to whoever<br/>originally paid (pot or signer)
```

**Why wrap instead of replace**: the wrapper delegates everything
it doesn't care about — nonce, mortality, metadata, tip — to the
inner extension. Only the fee accounting path is intercepted.

**Why top up the beneficiary instead of charging the sponsor
directly**: it keeps the beneficiary's `AccountId` as the fee payer
of record for event/refund purposes, and lets the native extension
work unchanged even when the beneficiary starts with balance `0`.

---
marp: true
theme: default
class: lead
paginate: true
backgroundColor: "#0b1020"
color: "#e2e8f0"
style: |
  section {
    font-family: "Inter", "SF Pro Display", system-ui, sans-serif;
  }
  h1, h2 {
    color: #a5b4fc;
  }
  code {
    background: #1e293b;
    color: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .tag {
    display: inline-block;
    background: #1e3a8a;
    color: #dbeafe;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.7em;
    margin-right: 6px;
  }
---

<!-- _class: lead -->

# SocialFi Protocol

### A composable social layer on Polkadot

**Germán Küber**
Builder · Polkadot ecosystem

<span class="tag">FRAME</span>
<span class="tag">PAPI</span>
<span class="tag">Statement Store</span>
<span class="tag">DotNS + Bulletin</span>

---

## The problem

Web2 social is **locked in**. Your identity, your graph, your content, your reach — all owned by platforms that can deplatform, demonetise or rewrite the rules overnight.

Web3 tried to fix it, but existing social protocols are:

- **Siloed** — each app ships its own identity, follow graph, moderation.
- **Expensive** — every like is an extrinsic; fees kill the UX.
- **Opaque for users** — no real-time notifications, no encrypted DMs, no identity reuse.

No shared substrate means every new app rebuilds the same primitives from scratch.

---

## Our solution

A **reference SocialFi stack** on Polkadot that every dapp can reuse:

- **Profiles** bound to any sr25519 account
- **Follow graph** as an O(1) on-chain storage map
- **Posts** — public, obfuscated, or end-to-end encrypted
- **App registry** so multiple frontends share the same social state
- **Sponsored fees** — zero-balance onboarding works out of the box
- **Real-time notifications** via the Substrate Statement Store
- **Identity** federated with the Polkadot People parachain

One runtime, six pallets, one PAPI-typed SDK.

---

## Features that actually ship

| Capability | How |
| --- | --- |
| 📬 Encrypted posts | Capsule sealed with external Key Service pubkey; OCW re-seals to the viewer |
| 🔔 Live notifications | `pallet-statement` gossip, `@polkadot-apps/statement-store` on the client |
| 💸 Sponsored txs | Custom `ChargeSponsored` TransactionExtension wrapping `ChargeTransactionPayment` |
| 🪪 Identity reuse | Second PAPI connection to Polkadot People for `Identity.IdentityOf` |
| 🌐 Decentralised delivery | Bundle lives on Bulletin chain, served via `dot.li` inside a sandboxed iframe |
| 🗂️ Read acceleration | Optional indexer denormalises events to lowdb / Postgres |

---

## Architecture

![w:1100](./assets/arch-mini.svg)

- **Frontend** runs inside a `dot.li` iframe — delivery is 100% on-chain (DotNS + Bulletin).
- **Runtime** wires six SocialFi pallets + `pallet-statement` through a single `construct_runtime!`.
- **Wallet** lives in the host, not in the iframe — `postMessage` bridge handles every signing request.
- **Key Service** is an external sidecar: custodies X25519 + sr25519, opens capsules + signs deliveries.
- **OCWs** stay inside the collator, off the consensus path.

Full diagram: root `README.md`. Layer-by-layer deep dive: `docs/ARCHITECTURE_OVERVIEW.md`.

---

## What's next

**Short-term (weeks)**

- Lift the Key Service out of the collator (`dev_key.rs` → real external service).
- Indexer: swap lowdb → Postgres + expose a public read API.
- Runtime integration tests beyond the compile-time API assertion.

**Medium-term (months)**

- Cross-chain post references via XCM to other SocialFi parachains.
- Mobile-native signing path via WalletConnect (already scaffolded in `@polkadot-apps/host`).
- Public beta on Paseo with a first partner app on top of the app registry.

**Ecosystem**

- Open-source every pallet as a reusable crate on crates.io.
- Publish the PAPI descriptors as an npm package so any React dapp can plug in.

---

<!-- _class: lead -->

# Thank you

**Germán Küber**
`germankuber` on GitHub · `socialfi.dot.li`

Questions?

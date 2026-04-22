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
    font-size: 30px;
  }
  h1 {
    color: #a5b4fc;
    font-size: 2em;
  }
  h2 {
    color: #a5b4fc;
  }
  ul li {
    margin-bottom: 14px;
  }
  strong {
    color: #fbbf24;
  }
  .tag {
    display: inline-block;
    background: #1e3a8a;
    color: #dbeafe;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 0.75em;
    margin: 4px;
  }
---

<!-- _class: lead -->

# SocialFi Protocol

### A composable social layer on Polkadot

**Germán Küber**

<span class="tag">FRAME</span>
<span class="tag">PAPI</span>
<span class="tag">Statement Store</span>
<span class="tag">DotNS</span>

---

## The problem

- Web2 social is **locked in**
- Web3 social is **siloed**
- Each app reinvents identity + graph
- Fees kill the UX
- No shared social substrate

---

## The solution

- **One runtime** — six pallets
- **Profiles + graph + posts** on-chain
- **Encrypted posts** end-to-end
- **Sponsored fees** onboard zero-balance users
- **Real-time notifications** via Statement Store
- **Identity** reused from Polkadot People

---

## What ships today

- 📬 Encrypted posts with capsule delivery
- 🔔 Live notifications, zero polling
- 💸 Gasless onboarding
- 🪪 Identity federated with People
- 🌐 App served from Bulletin chain
- 🗂️ Typed PAPI SDK out of the box

---

## Architecture

```mermaid
flowchart LR
    U(["👤 User"]) --> DL["🌐 dot.li"]
    DL --> FE["📱 Frontend"]
    FE --> Node["⛓️ Node<br/>6 SocialFi pallets"]
    FE --> People["🪪 People"]
    Node --> KS["🔑 Key Service"]

    classDef user fill:#064e3b,color:#d1fae5,stroke:#10b981
    classDef web fill:#1e3a8a,color:#dbeafe,stroke:#3b82f6
    classDef chain fill:#1e293b,color:#e2e8f0,stroke:#475569
    classDef ext fill:#581c87,color:#f3e8ff,stroke:#a855f7
    class U user
    class DL,FE web
    class Node,People chain
    class KS ext
```

- **dot.li** serves the app from Bulletin chain
- **Node** hosts six pallets + OCWs
- **People** provides identity
- **Key Service** custodies encryption keys

---

## What's next

- **Now**: production Key Service
- **Weeks**: Postgres indexer + tests
- **Months**: XCM posts + mobile signing
- **Ecosystem**: pallets on crates.io + PAPI on npm

---

<!-- _class: lead -->

# Thank you

**socialfi.dot.li**

Questions?

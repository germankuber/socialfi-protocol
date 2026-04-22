# Presentation — speaker notes

Timing target: **5:00 total** across 7 slides. ~40 seconds each.

Render the deck with Marp:

```bash
npx @marp-team/marp-cli docs/PRESENTATION.md -o docs/PRESENTATION.html
# or PDF:
npx @marp-team/marp-cli docs/PRESENTATION.md --pdf -o docs/PRESENTATION.pdf
```

---

## Slide 1 — Title (30 s)

Open fast. Don't read the slide. Say something like:

> "Hi, I'm Germán. I've been building a SocialFi reference stack on Polkadot for
> the last few months. In the next five minutes I want to show you why social
> apps on-chain keep reinventing the same wheel, what I built to stop that,
> and what's left to ship."

Transition line: **"Let's start with the problem."**

## Slide 2 — Problem (45 s)

Key beats:

- Web2: lock-in is the business model, not a bug.
- Web3 fixed custody but *not* the fragmentation. Every Lens-like, every
  Farcaster-like reimplements profile / follow / post from zero.
- Three concrete pains: siloed, expensive per-interaction, no UX primitives.

Land with: **"There's no shared substrate. That's what this project is."**

## Slide 3 — Solution (50 s)

Don't read the list. Narrate the shape:

> "One runtime, six pallets. Profiles, a follow graph, posts with
> visibility, a permissionless app registry, sponsored fees so zero-balance
> users can onboard, and identity federated with Polkadot People. On top of
> that, a typed PAPI SDK so any frontend plugs in without writing metadata
> parsers."

Call out: **"Apps don't own the state. They share it."**

## Slide 4 — Features (55 s)

Pick 2 of the 6 rows and spend time there. Best picks:

- **Encrypted posts** — capsule sealed with the Key Service pubkey, OCW
  re-seals for the viewer. Key custody is *out* of the collator.
- **Sponsored fees** — the `ChargeSponsored` TransactionExtension wraps the
  stock `ChargeTransactionPayment`. This is the trick that makes onboarding
  realistic without the user holding DOT first.

If time: **real-time notifications via the Statement Store** — no polling, no
custom indexer.

## Slide 5 — Architecture (60 s)

Point at:

1. **The iframe / dot.li path** — the app *itself* is served decentrally via
   Bulletin chain, not from a CDN. "socialfi.dot.li" resolves DotNS →
   contenthash → IPFS fetch → iframe. That's the web3 UX story.
2. **The Key Service outside the collator** — the one rough edge we already
   have a target architecture for.
3. **The wallet lives in the host**, not in the iframe. The `postMessage`
   bridge lets mobile signers (WalletConnect) plug in without a browser
   extension.

If the audience is technical, show the real `README.md` Mermaid.

## Slide 6 — Next steps (45 s)

Keep it honest. Three tiers:

- **Weeks** — the key custody migration, Postgres indexer, tests.
- **Months** — XCM for cross-chain posts, mobile signing, first partner on
  the app registry.
- **Ecosystem** — ship the pallets as crates, ship the PAPI descriptors as
  npm. A new SocialFi dapp should take hours, not weeks.

Land with: **"Everything in the diagrams is already in-source. This isn't a
research project."**

## Slide 7 — Thank you (15 s)

Short. Invite questions. Show the live URL `socialfi.dot.li`. Have the
repo open on screen for follow-up.

---

## Demo (optional, only if the slot allows)

If you have 2 extra minutes, open the browser and:

1. `socialfi.dot.li` — shows the app loading from Bulletin.
2. Login with Talisman, create a profile — shows sponsored fees (no DOT
   required on the user).
3. Post encrypted → unlock from a second account → bell notification fires
   in real time on both clients. That single demo touches every feature.

---

## Backup answers (likely questions)

- **"Why not EVM-compat smart contracts?"** — FRAME gives us real typed
  storage, native weights, and first-class OCWs for the key-service flow.
  Contracts would need a second layer for all three.
- **"Why Statement Store vs a normal indexer?"** — zero fee, zero block
  bloat, push-based. The indexer is optional, for denormalised views only.
- **"Is Bulletin production-ready?"** — not yet; deployed today on Paseo.
  The delivery path survives if we swap Bulletin for IPFS pinning later —
  DotNS contenthash is the indirection that makes that change invisible to
  users.
- **"What's the honest weak spot?"** — key custody. Today it's a compile-time
  constant. The target Key Service is designed but not deployed. That's the
  first line item on "next steps".

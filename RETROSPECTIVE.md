# PBP Project Retrospective

**Your name:** Germán Küber
**Project name:** SocialFi
**Repo URL:** _<!-- TODO: add repo URL -->_
**Path chosen:** Pallet + React web app

---

## What I built

SocialFi tackles a problem that has been open in the blockchain space for
years: owning our interactions without censorship, and being able to
monetize all of our interactions, opinions, and posts.

---

## Why I picked this path

I picked this path because the problem of decentralizing our digital
lives is something that has been addressed since the beginning of
blockchain and still does not have a solution. Implementing a solution
with a pallet feels like the right approach, since it lets you scale
and better control everything that happens inside the SocialFi
ecosystem.

---

## What worked

I enjoyed working on the pallet side, especially digging into topics
like custom origins and transaction sponsorship. Having the SDK open
was very useful — I used it as a reference when making design
decisions and when writing some of the tests.

---

## What broke

I ran into a lot of issues signing transactions from dot.li. The
wallet I was scanning the QR with didn't always work reliably.

On the other hand, the integration with `pallet-statement` was very
straightforward, although I couldn't manage to decode the events from
the frontend — the events arrive, but PAPI breaks when decoding them.

Another thing I hit was implementing a custom transaction extension
and the limitations around PAPI. (I solved this one later.)

---

## What I'd do differently

_<!-- TODO -->_

---

## Stack feedback for Parity

The main pain point was the lack of documentation on the tooling.
That forced me to pull down each tool and navigate the code with an
LLM just to understand what was going on.

As for the pallet experience — that was very good. It feels mature
and there is great documentation there.

---

## Links

- **Bug reports filed:**
- **PRs submitted to stack repos:**
- **Pitch slides / presentation:** https://docs.google.com/presentation/d/1NUj8pqjPjHmPQ1-SsTceBYSF-7cIFOFgjfnwzjvyQOI/edit?usp=sharing
- **Demo video (if any):**
- **Live deployment:** https://socialfi.dot.li
- **Anything else worth sharing:**

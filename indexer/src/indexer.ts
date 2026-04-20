import { createClient } from "polkadot-api";
import { getWsProvider } from "@polkadot-api/ws-provider/node";
import chalk from "chalk";
import { setLastBlock, insertEvent, insertTx } from "./db.js";

import { stack_template } from "../../web/.papi/descriptors/dist/index.mjs";

const WS_URL = process.env.WS_URL || "ws://127.0.0.1:9944";

function logEvent(pallet: string, event: string, block: number, data: Record<string, unknown>) {
  const ts = new Date().toLocaleTimeString();
  const prefix = chalk.gray(`[${ts}]`);
  const palletTag = chalk.cyan.bold(pallet);
  const eventTag = chalk.yellow.bold(event);
  const blockTag = chalk.magenta(`#${block}`);
  const dataStr = Object.entries(data)
    .map(([k, v]) => `${chalk.gray(k)}=${chalk.white(String(v))}`)
    .join(" ");
  console.log(`${prefix} ${palletTag}.${eventTag} ${blockTag} ${dataStr}`);
}

function logTx(kind: string, from: string, to: string, amount: string) {
  const prefix = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
  const arrow = to ? `${chalk.blue(from.slice(0, 8))} → ${chalk.green(to.slice(0, 8))}` : chalk.blue(from.slice(0, 8));
  const amountStr = amount !== "0" ? chalk.bold.yellow(amount) : chalk.gray("0");
  console.log(`  ${prefix} ${chalk.dim("tx")} ${chalk.white(kind)} ${arrow} ${amountStr}`);
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

// Helper: watch a PAPI event and process each emission
function watch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  observable: { watch: () => import("rxjs").Observable<any> },
  handler: (ev: { meta: { block: { number: number; hash: string } }; payload: Record<string, unknown> }) => Promise<void>,
) {
  observable.watch().subscribe({
    next: async (ev: unknown) => {
      try {
        const typed = ev as { meta: { block: { number: number; hash: string } }; payload: Record<string, unknown> };
        await handler(typed);
        // Only persist block number when we actually process an event
        await setLastBlock(typed.meta.block.number);
      } catch (err) {
        console.error("[indexer] Event handler error:", err);
      }
    },
    error: (err: unknown) => console.error("[indexer] Watch error:", err),
  });
}

export async function startIndexer() {
  console.log(chalk.bold.cyan(`[indexer]`) + ` Connecting to ${chalk.underline(WS_URL)}...`);
  const client = createClient(getWsProvider(WS_URL));
  const api = client.getTypedApi(stack_template);

  console.log(chalk.bold.cyan("[indexer]") + " Subscribing to social pallet events...");

  // Track finalized blocks — only log, don't write to disk every block.
  // lastBlock is updated in db only when we actually process an event.
  let latestBlock = 0;
  client.finalizedBlock$.subscribe((block) => {
    latestBlock = block.number;
    if (block.number % 100 === 0) console.log(chalk.gray(`[indexer] Block #${block.number}`));
  });

  // ── SocialAppRegistry ──
  watch(api.event.SocialAppRegistry.AppRegistered, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialAppRegistry", eventName: "AppRegistered", data: { owner: str(d.owner), app_id: Number(d.app_id) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "AppRegistered", from: str(d.owner), to: "", amount: "0", postId: null, appId: Number(d.app_id), timestamp: ts });
    logEvent("SocialAppRegistry", "AppRegistered", block.number, { owner: str(d.owner), app_id: Number(d.app_id) }); logTx("AppRegistered", str(d.owner), "", "0");
  });

  watch(api.event.SocialAppRegistry.AppDeregistered, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialAppRegistry", eventName: "AppDeregistered", data: { owner: str(d.owner), app_id: Number(d.app_id) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "AppDeregistered", from: str(d.owner), to: "", amount: "0", postId: null, appId: Number(d.app_id), timestamp: ts });
    logEvent("SocialAppRegistry", "AppDeregistered", block.number, { owner: str(d.owner), app_id: Number(d.app_id) });
  });

  // ── SocialProfiles ──
  watch(api.event.SocialProfiles.ProfileCreated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileCreated", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileCreated", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("SocialProfiles", "ProfileCreated", block.number, { account: str(d.account) }); logTx("ProfileCreated", str(d.account), "", "0");
  });

  watch(api.event.SocialProfiles.ProfileUpdated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileUpdated", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileUpdated", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("SocialProfiles", "ProfileUpdated", block.number, { account: str(d.account) });
  });

  watch(api.event.SocialProfiles.FollowFeeUpdated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "FollowFeeUpdated", data: { account: str(d.account), fee: str(d.fee) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "FollowFeeUpdated", from: str(d.account), to: "", amount: str(d.fee), postId: null, appId: null, timestamp: ts });
    logEvent("SocialProfiles", "FollowFeeUpdated", block.number, { account: str(d.account), fee: str(d.fee) });
  });

  watch(api.event.SocialProfiles.ProfileDeleted, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileDeleted", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileDeleted", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("SocialProfiles", "ProfileDeleted", block.number, { account: str(d.account) });
  });

  // ── SocialGraph ──
  watch(api.event.SocialGraph.Followed, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const fee = str(d.fee_paid);
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialGraph", eventName: "Followed", data: { follower: str(d.follower), followed: str(d.followed), fee_paid: fee }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "FollowFeePaid", from: str(d.follower), to: str(d.followed), amount: fee, postId: null, appId: null, timestamp: ts });
    if (fee !== "0") {
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "FollowFeeEarned", from: str(d.followed), to: str(d.follower), amount: fee, postId: null, appId: null, timestamp: ts });
    }
    logEvent("SocialGraph", "Followed", block.number, { follower: str(d.follower), followed: str(d.followed), fee }); logTx("FollowFeePaid", str(d.follower), str(d.followed), fee);
  });

  watch(api.event.SocialGraph.Unfollowed, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialGraph", eventName: "Unfollowed", data: { follower: str(d.follower), followed: str(d.followed) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "Unfollowed", from: str(d.follower), to: str(d.followed), amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("SocialGraph", "Unfollowed", block.number, { follower: str(d.follower), followed: str(d.followed) });
  });

  // ── SocialFeeds ──
  watch(api.event.SocialFeeds.PostCreated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const postId = Number(d.post_id);
    const appId = d.app_id != null ? Number(d.app_id) : null;
    const ts = Date.now();
    const postFee = str(d.post_fee);
    const feeRecipient = str(d.fee_recipient);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialFeeds", eventName: "PostCreated", data: { author: str(d.author), post_id: postId, app_id: appId, visibility: str((d.visibility as { type?: string })?.type), post_fee: postFee, fee_recipient: feeRecipient }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PostCreated", from: str(d.author), to: "", amount: "0", postId, appId, timestamp: ts });
    // Post fee payment
    if (postFee !== "0") {
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PostFeePaid", from: str(d.author), to: feeRecipient, amount: postFee, postId, appId, timestamp: ts });
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PostFeeEarned", from: feeRecipient, to: str(d.author), amount: postFee, postId, appId, timestamp: ts });
    }
    logEvent("SocialFeeds", "PostCreated", block.number, { author: str(d.author), post_id: postId, fee: postFee }); logTx("PostFeePaid", str(d.author), feeRecipient, postFee);
  });

  watch(api.event.SocialFeeds.ReplyCreated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const postId = Number(d.post_id);
    const parentPostId = Number(d.parent_post_id);
    const appId = d.app_id != null ? Number(d.app_id) : null;
    const replyFee = str(d.reply_fee_paid);
    const postFee = str(d.post_fee_paid);
    const parentAuthor = str(d.parent_author);
    const feeRecipient = str(d.fee_recipient);
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialFeeds", eventName: "ReplyCreated", data: { author: str(d.author), post_id: postId, parent_post_id: parentPostId, parent_author: parentAuthor, app_id: appId, reply_fee_paid: replyFee, post_fee_paid: postFee, fee_recipient: feeRecipient }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ReplyCreated", from: str(d.author), to: "", amount: "0", postId, appId, timestamp: ts });
    // Reply fee payment
    if (replyFee !== "0") {
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ReplyFeePaid", from: str(d.author), to: parentAuthor, amount: replyFee, postId: parentPostId, appId: null, timestamp: ts });
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ReplyFeeEarned", from: parentAuthor, to: str(d.author), amount: replyFee, postId: parentPostId, appId: null, timestamp: ts });
    }
    // Post fee payment
    if (postFee !== "0") {
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PostFeePaid", from: str(d.author), to: feeRecipient, amount: postFee, postId, appId, timestamp: ts });
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PostFeeEarned", from: feeRecipient, to: str(d.author), amount: postFee, postId, appId, timestamp: ts });
    }
    logEvent("SocialFeeds", "ReplyCreated", block.number, { author: str(d.author), post_id: postId, parent: parentPostId, reply_fee: replyFee, post_fee: postFee }); logTx("ReplyCreated", str(d.author), parentAuthor, replyFee);
  });

  watch(api.event.SocialFeeds.PostUnlocked, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const fee = str(d.fee_paid);
    const postId = Number(d.post_id);
    const author = str(d.author);
    const viewer = str(d.viewer);
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialFeeds", eventName: "PostUnlocked", data: { viewer, author, post_id: postId, fee_paid: fee }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "UnlockFeePaid", from: viewer, to: author, amount: fee, postId, appId: null, timestamp: ts });
    if (fee !== "0") {
      await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "UnlockFeeEarned", from: author, to: viewer, amount: fee, postId, appId: null, timestamp: ts });
    }
    logEvent("SocialFeeds", "PostUnlocked", block.number, { viewer, author, post_id: postId, fee }); logTx("UnlockFeePaid", viewer, author, fee);
  });

  // ── Sponsorship ──
  // Every FeeSponsored event tells us the pot paid a beneficiary's tx fee.
  // This is the canonical proof that ChargeSponsored fired (debited sponsor
  // pot, credited beneficiary by the same amount); ChargeTransactionPayment
  // then withdraws the fee from the beneficiary, netting their balance to
  // zero. If you never see FeeSponsored in the same block a beneficiary
  // signs, the extension was skipped (pot empty, no sponsor, etc.).
  watch(api.event.Sponsorship.FeeSponsored, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const beneficiary = str(d.beneficiary);
    const fee = str(d.fee);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "FeeSponsored", data: { sponsor, beneficiary, fee }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "FeeSponsored", from: sponsor, to: beneficiary, amount: fee, postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "FeeSponsored", block.number, { sponsor, beneficiary, fee }); logTx("FeeSponsored", sponsor, beneficiary, fee);
  });

  watch(api.event.Sponsorship.BeneficiaryRegistered, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const beneficiary = str(d.beneficiary);
    const previous = d.previous_sponsor == null ? "" : str(d.previous_sponsor);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "BeneficiaryRegistered", data: { sponsor, beneficiary, previous_sponsor: previous }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "BeneficiaryRegistered", from: sponsor, to: beneficiary, amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "BeneficiaryRegistered", block.number, { sponsor, beneficiary, previous });
  });

  watch(api.event.Sponsorship.BeneficiaryRevoked, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const beneficiary = str(d.beneficiary);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "BeneficiaryRevoked", data: { sponsor, beneficiary }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "BeneficiaryRevoked", from: sponsor, to: beneficiary, amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "BeneficiaryRevoked", block.number, { sponsor, beneficiary });
  });

  watch(api.event.Sponsorship.SponsorAbandoned, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const beneficiary = str(d.beneficiary);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "SponsorAbandoned", data: { sponsor, beneficiary }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "SponsorAbandoned", from: beneficiary, to: sponsor, amount: "0", postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "SponsorAbandoned", block.number, { sponsor, beneficiary });
  });

  watch(api.event.Sponsorship.PotToppedUp, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const amount = str(d.amount);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "PotToppedUp", data: { sponsor, amount }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PotToppedUp", from: sponsor, to: "", amount, postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "PotToppedUp", block.number, { sponsor, amount });
  });

  watch(api.event.Sponsorship.PotWithdrawn, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    const sponsor = str(d.sponsor);
    const amount = str(d.amount);
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "Sponsorship", eventName: "PotWithdrawn", data: { sponsor, amount }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "PotWithdrawn", from: sponsor, to: "", amount, postId: null, appId: null, timestamp: ts });
    logEvent("Sponsorship", "PotWithdrawn", block.number, { sponsor, amount });
  });

  console.log(chalk.bold.green("[indexer]") + " ✓ Watching all social + sponsorship events");
}

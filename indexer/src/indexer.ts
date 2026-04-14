import { createClient } from "polkadot-api";
import { getWsProvider } from "@polkadot-api/ws-provider/node";
import { setLastBlock, insertEvent, insertTx } from "./db.js";

import { stack_template } from "../../web/.papi/descriptors/dist/index.mjs";

const WS_URL = process.env.WS_URL || "ws://127.0.0.1:9944";

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
        await handler(ev as { meta: { block: { number: number; hash: string } }; payload: Record<string, unknown> });
      } catch (err) {
        console.error("[indexer] Event handler error:", err);
      }
    },
    error: (err: unknown) => console.error("[indexer] Watch error:", err),
  });
}

export async function startIndexer() {
  console.log(`[indexer] Connecting to ${WS_URL}...`);
  const client = createClient(getWsProvider(WS_URL));
  const api = client.getTypedApi(stack_template);

  console.log("[indexer] Subscribing to events...");

  // Track finalized blocks
  client.finalizedBlock$.subscribe(async (block) => {
    await setLastBlock(block.number);
    if (block.number % 100 === 0) console.log(`[indexer] Block #${block.number}`);
  });

  // ── SocialAppRegistry ──
  watch(api.event.SocialAppRegistry.AppRegistered, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialAppRegistry", eventName: "AppRegistered", data: { owner: str(d.owner), app_id: Number(d.app_id) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "AppRegistered", from: str(d.owner), to: "", amount: "0", postId: null, appId: Number(d.app_id), timestamp: ts });
    console.log(`[event] AppRegistered #${d.app_id} by ${str(d.owner).slice(0, 10)}`);
  });

  watch(api.event.SocialAppRegistry.AppDeregistered, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialAppRegistry", eventName: "AppDeregistered", data: { owner: str(d.owner), app_id: Number(d.app_id) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "AppDeregistered", from: str(d.owner), to: "", amount: "0", postId: null, appId: Number(d.app_id), timestamp: ts });
  });

  // ── SocialProfiles ──
  watch(api.event.SocialProfiles.ProfileCreated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileCreated", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileCreated", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
    console.log(`[event] ProfileCreated ${str(d.account).slice(0, 10)}`);
  });

  watch(api.event.SocialProfiles.ProfileUpdated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileUpdated", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileUpdated", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
  });

  watch(api.event.SocialProfiles.FollowFeeUpdated, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "FollowFeeUpdated", data: { account: str(d.account), fee: str(d.fee) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "FollowFeeUpdated", from: str(d.account), to: "", amount: str(d.fee), postId: null, appId: null, timestamp: ts });
  });

  watch(api.event.SocialProfiles.ProfileDeleted, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialProfiles", eventName: "ProfileDeleted", data: { account: str(d.account) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "ProfileDeleted", from: str(d.account), to: "", amount: "0", postId: null, appId: null, timestamp: ts });
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
    console.log(`[event] Followed ${str(d.follower).slice(0, 8)} → ${str(d.followed).slice(0, 8)} fee=${fee}`);
  });

  watch(api.event.SocialGraph.Unfollowed, async (ev) => {
    const { block } = ev.meta;
    const d = ev.payload;
    const ts = Date.now();
    await insertEvent({ blockNumber: block.number, blockHash: block.hash, pallet: "SocialGraph", eventName: "Unfollowed", data: { follower: str(d.follower), followed: str(d.followed) }, timestamp: ts });
    await insertTx({ blockNumber: block.number, blockHash: block.hash, kind: "Unfollowed", from: str(d.follower), to: str(d.followed), amount: "0", postId: null, appId: null, timestamp: ts });
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
    console.log(`[event] PostCreated #${postId} by ${str(d.author).slice(0, 10)} fee=${postFee}`);
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
    console.log(`[event] ReplyCreated #${postId} → parent #${parentPostId} replyFee=${replyFee} postFee=${postFee}`);
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
    console.log(`[event] PostUnlocked #${postId} by ${viewer.slice(0, 8)} fee=${fee}`);
  });

  console.log("[indexer] Watching all social pallet events...");
}

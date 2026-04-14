import express from "express";
import cors from "cors";
import {
  insertTx,
  insertEvent,
  getTxByAddress,
  getRecentEvents,
  getEventsByPallet,
  getPostEarnings,
  getStats,
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── POST /api/event — frontend reports a social event ──
app.post("/api/event", async (req, res) => {
  try {
    const { blockNumber, blockHash, pallet, eventName, data } = req.body;
    if (!pallet || !eventName) {
      res.status(400).json({ error: "Missing pallet or eventName" });
      return;
    }

    const timestamp = Date.now();
    const d = data || {};
    const bn = blockNumber || 0;
    const bh = blockHash || "";

    await insertEvent({ blockNumber: bn, blockHash: bh, pallet, eventName, data: d, timestamp });

    const key = `${pallet}.${eventName}`;
    switch (key) {
      case "SocialAppRegistry.AppRegistered":
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "AppRegistered", from: d.owner || "", to: "", amount: "0", postId: null, appId: d.app_id ?? null, timestamp });
        break;
      case "SocialProfiles.ProfileCreated":
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "ProfileCreated", from: d.account || "", to: "", amount: "0", postId: null, appId: null, timestamp });
        break;
      case "SocialGraph.Followed": {
        const fee = String(d.fee_paid || "0");
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "FollowFeePaid", from: d.follower || "", to: d.followed || "", amount: fee, postId: null, appId: null, timestamp });
        if (fee !== "0") {
          await insertTx({ blockNumber: bn, blockHash: bh, kind: "FollowFeeEarned", from: d.followed || "", to: d.follower || "", amount: fee, postId: null, appId: null, timestamp });
        }
        break;
      }
      case "SocialGraph.Unfollowed":
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "Unfollowed", from: d.follower || "", to: d.followed || "", amount: "0", postId: null, appId: null, timestamp });
        break;
      case "SocialFeeds.PostCreated":
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "PostCreated", from: d.author || "", to: "", amount: "0", postId: d.post_id ?? null, appId: d.app_id ?? null, timestamp });
        break;
      case "SocialFeeds.ReplyCreated": {
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "ReplyCreated", from: d.author || "", to: "", amount: "0", postId: d.post_id ?? null, appId: d.app_id ?? null, timestamp });
        if (d.reply_fee && String(d.reply_fee) !== "0") {
          await insertTx({ blockNumber: bn, blockHash: bh, kind: "ReplyFeeEarned", from: d.parent_author || "", to: d.author || "", amount: String(d.reply_fee), postId: d.parent_post_id ?? null, appId: null, timestamp });
        }
        break;
      }
      case "SocialFeeds.PostUnlocked": {
        const fee = String(d.fee_paid || "0");
        await insertTx({ blockNumber: bn, blockHash: bh, kind: "UnlockFeePaid", from: d.viewer || "", to: d.author || "", amount: fee, postId: d.post_id ?? null, appId: null, timestamp });
        if (fee !== "0") {
          await insertTx({ blockNumber: bn, blockHash: bh, kind: "UnlockFeeEarned", from: d.author || "", to: d.viewer || "", amount: fee, postId: d.post_id ?? null, appId: null, timestamp });
        }
        break;
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[api] Error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.get("/api/tx/:address", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(getTxByAddress(req.params.address, limit));
});

app.get("/api/events", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const pallet = req.query.pallet as string | undefined;
  res.json(pallet ? getEventsByPallet(pallet, limit) : getRecentEvents(limit));
});

app.get("/api/post/:postId/earnings", (req, res) => {
  res.json({ total: getPostEarnings(parseInt(req.params.postId)) });
});

app.get("/api/stats", (_req, res) => {
  res.json(getStats());
});

export function startApi(port = 3001) {
  app.listen(port, () => {
    console.log(`[api] http://localhost:${port}`);
    console.log(`[api] POST /api/event | GET /api/tx/:addr | GET /api/events | GET /api/stats`);
  });
}

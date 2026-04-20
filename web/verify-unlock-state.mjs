import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { stack_template } from "./.papi/descriptors/dist/index.mjs";

const client = createClient(getWsProvider("ws://127.0.0.1:9944"));
const api = client.getTypedApi(stack_template);

const ks = await api.query.SocialFeeds.KeyService.getValue();
console.log("KeyService:", ks ? {
	account: ks.account.toString(),
	pk_hex: Buffer.from(ks.encryption_pk.asBytes()).toString("hex"),
	version: Number(ks.version),
} : "NOT SET");

const pending = await api.query.SocialFeeds.PendingUnlocks.getEntries();
console.log(`\nPendingUnlocks: ${pending.length}`);
for (const { keyArgs } of pending) {
	const [postId, viewer] = keyArgs[0];
	console.log(`  post_id=${postId}  viewer=${viewer}`);
}

const unlocks = await api.query.SocialFeeds.Unlocks.getEntries();
console.log(`\nUnlocks: ${unlocks.length}`);
for (const { keyArgs, value } of unlocks) {
	const [postId, viewer] = keyArgs;
	const wk = value.wrapped_key;
	console.log(
		`  post_id=${postId}  viewer=${viewer}  wrapped_key=${wk ? `Some(${wk.asBytes().length}b)` : "None"}  requested_at=${value.requested_at}`,
	);
}

const head = await api.query.System.Number.getValue();
console.log(`\ncurrent block: ${head}`);

client.destroy();
process.exit(0);

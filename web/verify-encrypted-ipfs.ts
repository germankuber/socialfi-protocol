/**
 * Standalone script: fetch all posts from chain, find encrypted ones
 * (capsule = Some), pull the IPFS blob, and show whether the bytes on
 * IPFS are opaque ciphertext or readable plaintext.
 *
 * Run: cd web && npx tsx verify-encrypted-ipfs.ts
 */
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { stack_template } from "./.papi/descriptors/dist/index.mjs";

const IPFS_GATEWAYS = [
	"http://127.0.0.1:8080/ipfs/",
	"https://ipfs.io/ipfs/",
	"https://cloudflare-ipfs.com/ipfs/",
	"https://gateway.pinata.cloud/ipfs/",
];

function toText(bytes: Uint8Array): string {
	return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function isPrintableJsonish(bytes: Uint8Array): boolean {
	if (bytes.length < 2) return false;
	const first = bytes[0];
	if (first !== 0x7b && first !== 0x5b) return false;
	let printable = 0;
	const sample = bytes.slice(0, Math.min(bytes.length, 512));
	for (const b of sample) {
		if ((b >= 0x20 && b < 0x7f) || b === 0x09 || b === 0x0a || b === 0x0d) printable++;
	}
	return printable / sample.length > 0.9;
}

async function fetchFromIpfs(cid: string): Promise<Uint8Array> {
	for (const gw of IPFS_GATEWAYS) {
		try {
			const r = await fetch(gw + cid, { signal: AbortSignal.timeout(8000) });
			if (r.ok) return new Uint8Array(await r.arrayBuffer());
		} catch {
			// try next
		}
	}
	throw new Error(`no gateway served ${cid}`);
}

async function main() {
	console.log("connecting to ws://127.0.0.1:9944 ...");
	const client = createClient(getWsProvider("ws://127.0.0.1:9944"));
	const api = client.getTypedApi(stack_template);

	const posts = await api.query.SocialFeeds.Posts.getEntries();
	console.log(`chain has ${posts.length} post(s)\n`);

	let checked = 0;
	for (const { keyArgs, value } of posts) {
		const [postId] = keyArgs as [bigint];
		const info = value as {
			author: unknown;
			content: { asBytes?: () => Uint8Array } | Uint8Array;
			visibility: { type: string };
			capsule?: { asBytes?: () => Uint8Array } | null;
		};

		const contentBytes =
			typeof (info.content as any).asBytes === "function"
				? (info.content as any).asBytes()
				: (info.content as Uint8Array);
		const cid = toText(contentBytes);
		const capsuleLen =
			info.capsule && typeof (info.capsule as any).asBytes === "function"
				? (info.capsule as any).asBytes().length
				: info.capsule && info.capsule instanceof Uint8Array
				? (info.capsule as Uint8Array).length
				: 0;

		console.log(`post ${postId}`);
		console.log(`  visibility  : ${info.visibility.type}`);
		console.log(`  content(CID): ${cid}`);
		console.log(`  capsule     : ${capsuleLen ? `Some(${capsuleLen} bytes)` : "None"}`);

		if (!cid.startsWith("Qm") && !cid.startsWith("bafy") && !cid.startsWith("bafk")) {
			console.log(`  [skip] not a CID-looking string\n`);
			continue;
		}

		try {
			const blob = await fetchFromIpfs(cid);
			const jsonish = isPrintableJsonish(blob);
			const head = Array.from(blob.slice(0, 32))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join(" ");
			console.log(`  ipfs bytes  : ${blob.length}`);
			console.log(`  ipfs head   : ${head}`);
			console.log(`  ascii-head  : ${JSON.stringify(toText(blob.slice(0, 48)))}`);
			console.log(
				`  looks like  : ${jsonish ? "❌ PLAINTEXT JSON" : "✅ opaque binary (encrypted)"}`,
			);

			if (capsuleLen > 0 && blob.length >= 24 + 4) {
				const aadLen = new DataView(blob.buffer, blob.byteOffset + 24, 4).getUint32(0, true);
				console.log(
					`  frame check : nonce=24  aad_len=${aadLen}  ciphertext=${blob.length - 24 - 4 - aadLen}`,
				);
			}
		} catch (err) {
			console.log(`  ipfs fetch failed: ${(err as Error).message}`);
		}
		console.log();
		checked++;
	}

	console.log(`done — inspected ${checked} post(s)`);
	client.destroy();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

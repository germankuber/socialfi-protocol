import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/node";
import { stack_template } from "./.papi/descriptors/dist/index.mjs";

const IPFS_GATEWAYS = [
	"http://127.0.0.1:8080/ipfs/",
	"https://ipfs.io/ipfs/",
	"https://cloudflare-ipfs.com/ipfs/",
	"https://gateway.pinata.cloud/ipfs/",
];

const td = new TextDecoder("utf-8", { fatal: false });

function isPrintableJsonish(bytes) {
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

async function fetchFromIpfs(cid) {
	for (const gw of IPFS_GATEWAYS) {
		try {
			const r = await fetch(gw + cid, { signal: AbortSignal.timeout(10000) });
			if (r.ok) return { bytes: new Uint8Array(await r.arrayBuffer()), gw };
		} catch {}
	}
	throw new Error(`no gateway served ${cid}`);
}

function toBytes(v) {
	if (!v) return new Uint8Array();
	if (v instanceof Uint8Array) return v;
	if (typeof v.asBytes === "function") return v.asBytes();
	if (Array.isArray(v)) return new Uint8Array(v);
	return new Uint8Array();
}

const client = createClient(getWsProvider("ws://127.0.0.1:9944"));
const api = client.getTypedApi(stack_template);

console.log("fetching posts from chain ...");
const posts = await api.query.SocialFeeds.Posts.getEntries();
console.log(`chain has ${posts.length} post(s)\n`);

for (const { keyArgs, value } of posts) {
	const postId = keyArgs[0];
	const contentBytes = toBytes(value.content);
	const cid = td.decode(contentBytes);
	const capsule = toBytes(value.capsule);
	const visibility = value.visibility?.type ?? value.visibility;

	console.log(`post ${postId}`);
	console.log(`  visibility  : ${visibility}`);
	console.log(`  content(CID): ${cid}`);
	console.log(`  capsule     : ${capsule.length ? `Some(${capsule.length} bytes)` : "None"}`);

	if (!/^(Qm|bafy|bafk)/.test(cid)) {
		console.log(`  [skip] not CID-looking\n`);
		continue;
	}

	try {
		const { bytes, gw } = await fetchFromIpfs(cid);
		const jsonish = isPrintableJsonish(bytes);
		const head = Array.from(bytes.slice(0, 32))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join(" ");
		console.log(`  gateway     : ${gw}`);
		console.log(`  ipfs bytes  : ${bytes.length}`);
		console.log(`  hex head    : ${head}`);
		console.log(`  ascii head  : ${JSON.stringify(td.decode(bytes.slice(0, 64)))}`);
		console.log(
			`  verdict     : ${jsonish ? "❌ PLAINTEXT on IPFS" : "✅ opaque ciphertext on IPFS"}`,
		);
		if (capsule.length > 0 && bytes.length >= 28) {
			const aadLen = new DataView(bytes.buffer, bytes.byteOffset + 24, 4).getUint32(0, true);
			const ctLen = bytes.length - 24 - 4 - aadLen;
			console.log(
				`  frame check : nonce=24  aad_len=${aadLen}  ciphertext+tag=${ctLen}${
					aadLen === 32 && ctLen > 16 ? " ✓ matches xchacha20-poly1305 framing" : ""
				}`,
			);
		}
	} catch (err) {
		console.log(`  ipfs fetch failed: ${err.message}`);
	}
	console.log();
}

client.destroy();
process.exit(0);

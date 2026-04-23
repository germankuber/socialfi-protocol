import { useCallback } from "react";

const IPFS_UPLOAD = "https://api.thegraph.com/ipfs/api/v0/add";
const IPFS_GATEWAYS = [
	"https://ipfs.io/ipfs",
	"https://dweb.link/ipfs",
	"https://cloudflare-ipfs.com/ipfs",
];

export interface ProfileMetadata {
	name: string;
	bio: string;
	avatar: string; // IPFS CID of the avatar image (not a data URL)
	links: Record<string, string>;
}

/**
 * Upload a blob to IPFS via The Graph's public IPFS API.
 * Returns the CID (hash).
 */
async function uploadToIpfs(blob: Blob, filename: string): Promise<string> {
	const formData = new FormData();
	formData.append("file", blob, filename);

	const response = await fetch(IPFS_UPLOAD, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`IPFS upload failed: ${response.status}`);
	}

	const result = await response.json();
	return result.Hash as string;
}

export function useIpfs() {
	/** Upload an image file to IPFS. Returns the CID. */
	const uploadImage = useCallback(async (file: File): Promise<string> => {
		return uploadToIpfs(file, file.name);
	}, []);

	/** Upload profile metadata JSON to IPFS. Returns the CID. */
	const uploadProfileMetadata = useCallback(
		async (metadata: ProfileMetadata): Promise<string> => {
			const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
			return uploadToIpfs(blob, "profile.json");
		},
		[],
	);

	/** Fetch profile metadata from IPFS by CID. Tries multiple gateways. */
	const fetchProfileMetadata = useCallback(
		async (cid: string): Promise<ProfileMetadata | null> => {
			for (const gw of IPFS_GATEWAYS) {
				try {
					const res = await fetch(`${gw}/${cid}`, { signal: AbortSignal.timeout(10000) });
					if (res.ok) return await res.json();
				} catch {
					continue;
				}
			}
			return null;
		},
		[],
	);

	/** Get a public IPFS gateway URL for a CID. */
	const ipfsUrl = useCallback((cid: string): string => {
		return `${IPFS_GATEWAYS[0]}/${cid}`;
	}, []);

	/** Upload a post to IPFS. Optionally with an image CID. Returns the CID. */
	const uploadPostContent = useCallback(
		async (text: string, imageCid?: string): Promise<string> => {
			const payload: Record<string, unknown> = { text, ts: Date.now() };
			if (imageCid) payload.image = imageCid;
			const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
			return uploadToIpfs(blob, "post.json");
		},
		[],
	);

	/** Fetch post content from IPFS. Returns { text, image? }. */
	const fetchPostContent = useCallback(
		async (cid: string): Promise<{ text: string; image?: string } | null> => {
			for (const gw of IPFS_GATEWAYS) {
				try {
					const res = await fetch(`${gw}/${cid}`, { signal: AbortSignal.timeout(10000) });
					if (res.ok) {
						const data = await res.json();
						return { text: data.text ?? JSON.stringify(data), image: data.image };
					}
				} catch {
					continue;
				}
			}
			return null;
		},
		[],
	);

	return {
		uploadImage,
		uploadProfileMetadata,
		fetchProfileMetadata,
		uploadPostContent,
		fetchPostContent,
		ipfsUrl,
	};
}

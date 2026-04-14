import { useCallback } from "react";

const CRUST_GATEWAY = "https://gw.crustfiles.app";
const CRUST_PINNING = "https://pin.crustcode.com/psa";

interface UploadResult {
	cid: string;
}

/**
 * Uploads a JSON object to IPFS via Crust W3Auth Gateway.
 *
 * Auth: signs the account address with the substrate keypair,
 * then uses Basic auth header: `sub-<address>:<0xSignature>`.
 *
 * Falls back to unsigned upload if signing is not available
 * (Crust gateway allows limited unsigned uploads for testing).
 */
async function uploadToIpfsGateway(
	data: unknown,
	authHeader?: string,
): Promise<UploadResult> {
	const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
	const formData = new FormData();
	formData.append("file", blob, "metadata.json");

	const headers: Record<string, string> = {};
	if (authHeader) {
		headers["Authorization"] = `Basic ${authHeader}`;
	}

	const response = await fetch(`${CRUST_GATEWAY}/api/v0/add`, {
		method: "POST",
		headers,
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
	}

	const result = await response.json();
	return { cid: result.Hash };
}

async function pinOnCrust(cid: string, name: string, authHeader?: string): Promise<void> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (authHeader) {
		headers["Authorization"] = `Bearer ${authHeader}`;
	}

	const response = await fetch(`${CRUST_PINNING}/pins`, {
		method: "POST",
		headers,
		body: JSON.stringify({ cid, name }),
	});

	if (!response.ok) {
		// Pinning is best-effort — don't fail the whole flow
	}
}

export interface ProfileMetadata {
	name: string;
	bio: string;
	avatar: string;
	links: Record<string, string>;
}

export function useIpfs() {
	/**
	 * Upload profile metadata JSON to IPFS and pin it.
	 * Returns the CID string.
	 */
	const uploadProfileMetadata = useCallback(
		async (metadata: ProfileMetadata, authHeader?: string): Promise<string> => {
			const result = await uploadToIpfsGateway(metadata, authHeader);

			// Best-effort pin
			pinOnCrust(result.cid, `profile-${Date.now()}`, authHeader).catch(() => {});

			return result.cid;
		},
		[],
	);

	/**
	 * Fetch profile metadata JSON from IPFS by CID.
	 */
	const fetchProfileMetadata = useCallback(
		async (cid: string): Promise<ProfileMetadata | null> => {
			try {
				// Try Crust gateway first, then public IPFS gateway
				const gateways = [
					`${CRUST_GATEWAY}/ipfs/${cid}`,
					`https://ipfs.io/ipfs/${cid}`,
					`https://dweb.link/ipfs/${cid}`,
				];

				for (const url of gateways) {
					try {
						const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
						if (response.ok) {
							return await response.json();
						}
					} catch {
						continue;
					}
				}
				return null;
			} catch {
				return null;
			}
		},
		[],
	);

	return { uploadProfileMetadata, fetchProfileMetadata };
}

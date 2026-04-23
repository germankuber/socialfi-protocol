import { useEffect, useRef, useState } from "react";
import { StatementStoreClient } from "@polkadot-apps/statement-store";
import { ss58Decode } from "@polkadot-labs/hdkd-helpers";
import { useChainStore } from "../../store/chainStore";
import { useSelectedAccount } from "./useSelectedAccount";

/**
 * Shape of every notification JSON emitted by the SocialFi pallets.
 * Kept in sync with `social-notifications-primitives::NotificationPayload`
 * on the Rust side — both sides must agree on field names.
 */
export interface NotificationEvent {
	kind: "reply" | "new-app" | "follow";
	/** Lowercase hex (no 0x) of the SCALE-encoded sender account. */
	sender: string;
	/** Lowercase hex of the SCALE-encoded entity id (post id, app id, follower). */
	entity: string;
	/** Block height the source event was emitted at. */
	block: number;
	/** Monotonic id assigned client-side so the UI can dedup / animate. */
	id: string;
	/** When the client received it (ms). */
	receivedAt: number;
}

interface NotificationsState {
	items: NotificationEvent[];
	connected: boolean;
	error: string | null;
}

const APP_NAME = "stack-template-notifications";
const BROADCAST_NEW_APP_TOPIC = "broadcast/new-app";

/**
 * Convert a raw public key or ss58 address into the lowercase hex string
 * the backend feeds into `createTopic(hexAccountId)`. The backend hashes
 * hex(scale_encode(account_id)); for `AccountId32` that is hex of the
 * 32-byte public key with no 0x prefix.
 */
function addressToTopicInput(address: string): string | null {
	try {
		const publicKey = ss58Decode(address)[0];
		let hex = "";
		for (let i = 0; i < publicKey.length; i++) {
			hex += publicKey[i].toString(16).padStart(2, "0");
		}
		return hex;
	} catch {
		return null;
	}
}

/**
 * Subscribe to real-time SocialFi notifications for the currently
 * selected account. Opens a single long-lived `StatementStoreClient`
 * against the configured WS endpoint, requests the recipient topic
 * plus the broadcast-new-app topic, and pushes every decoded event
 * into local state.
 *
 * The hook is intentionally read-only: it never publishes. Pallets
 * are the only producers of notifications in this project, so there
 * is nothing to submit from the browser.
 */
export function useNotifications(): NotificationsState {
	const { account } = useSelectedAccount();
	const wsUrl = useChainStore((s) => s.wsUrl);
	const connected = useChainStore((s) => s.connected);

	const [items, setItems] = useState<NotificationEvent[]>([]);
	const [clientConnected, setClientConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Incremented on each new notification so React keys stay stable
	// even when two events share the same block number.
	const sequenceRef = useRef(0);

	useEffect(() => {
		if (!connected || !account) {
			// No subscription yet — `clientConnected` remains `false`
			// until `bootstrap()` resolves. Resetting it here would be a
			// sync setState in an effect (cascading render) so we rely
			// on the cleanup below to reset it on account/ws changes.
			return;
		}

		const maybeRecipientTopic = addressToTopicInput(account.address);
		if (!maybeRecipientTopic) {
			// Defer the error to a microtask to keep the effect body
			// free of sync setState calls.
			queueMicrotask(() => setError(`Could not derive topic for account ${account.address}`));
			return;
		}
		const recipientTopic: string = maybeRecipientTopic;

		const client = new StatementStoreClient({
			appName: APP_NAME,
			endpoint: wsUrl,
		});

		let disposed = false;
		let directSub: { unsubscribe: () => void } | null = null;
		let broadcastSub: { unsubscribe: () => void } | null = null;

		const handle = (event: NotificationEvent) => {
			if (disposed) return;
			setItems((prev) => {
				// Skip duplicates (id comes from the statement contents,
				// not our counter — the counter only protects the UI key).
				const dedupKey = `${event.kind}:${event.sender}:${event.entity}:${event.block}`;
				if (prev.some((p) => `${p.kind}:${p.sender}:${p.entity}:${p.block}` === dedupKey)) {
					return prev;
				}
				sequenceRef.current += 1;
				const enriched: NotificationEvent = {
					...event,
					id: `${sequenceRef.current}-${dedupKey}`,
					receivedAt: Date.now(),
				};
				return [enriched, ...prev].slice(0, 200);
			});
		};

		async function bootstrap() {
			try {
				// Minimal local signer — the client still requires one even
				// if we never call `publish`. Uses a throwaway zero key
				// because pallets, not the browser, are the only publishers
				// of notifications in this app.
				await client.connect({
					mode: "local",
					signer: {
						publicKey: new Uint8Array(32),
						sign: async () => new Uint8Array(64),
					},
				});
				if (disposed) return;

				directSub = client.subscribe<NotificationEvent>(
					(statement) => handle(statement.data),
					{ topic2: recipientTopic },
				);

				broadcastSub = client.subscribe<NotificationEvent>(
					(statement) => handle(statement.data),
					{ topic2: BROADCAST_NEW_APP_TOPIC },
				);

				setClientConnected(true);
				setError(null);
			} catch (err: unknown) {
				if (!disposed) {
					setClientConnected(false);
					setError(
						err instanceof Error ? err.message : "Failed to connect to Statement Store",
					);
				}
			}
		}

		void bootstrap();

		return () => {
			disposed = true;
			directSub?.unsubscribe();
			broadcastSub?.unsubscribe();
			client.destroy();
			// Safe here — React cleanup runs after commit, not during
			// render.
			setClientConnected(false);
		};
	}, [account, connected, wsUrl]);

	return { items, connected: clientConnected, error };
}

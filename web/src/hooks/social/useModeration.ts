import { useCallback } from "react";
import type { PolkadotSigner } from "polkadot-api";
import { useSocialApi } from "./useSocialApi";
import { useTxTracker } from "./useTxTracker";

/**
 * Hook exposing the app-owner moderation flow. The actual on-chain path
 * is a two-pallet dispatch: `SocialAppRegistry.act_as_moderator` wraps
 * `SocialFeeds.redact_post` so the inner call runs under the custom
 * `Origin::AppModerator { app_id, moderator }` — the runtime's single
 * consumer of a custom `#[pallet::origin]`.
 */
export function useModeration() {
	const { getApi } = useSocialApi();
	const tracker = useTxTracker();

	/**
	 * Redact `postId` from `appId`. The signer must own the app — the
	 * runtime enforces this in `act_as_moderator` before dispatching,
	 * and `redact_post` additionally verifies the post belongs to the
	 * authorised app.
	 */
	const redactPost = useCallback(
		async (appId: number, postId: bigint, signer: PolkadotSigner) => {
			const api = getApi();
			const innerTx = api.tx.SocialFeeds.redact_post({ post_id: postId });
			const outerTx = api.tx.SocialAppRegistry.act_as_moderator({
				app_id: appId,
				call: innerTx.decodedCall,
			});
			return tracker.submit(outerTx, signer, "Takedown post");
		},
		[getApi, tracker],
	);

	return { redactPost, tracker };
}

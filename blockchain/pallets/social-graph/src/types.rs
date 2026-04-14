use frame::prelude::*;

use super::pallet::Config;

/// On-chain record for an active follow relationship.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct FollowInfo<T: Config> {
	/// Block number when the follow was created.
	pub created_at: BlockNumberFor<T>,
}

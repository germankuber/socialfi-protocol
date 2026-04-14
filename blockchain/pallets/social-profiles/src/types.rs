use frame::prelude::*;

use super::pallet::{BalanceOf, Config};

/// On-chain record for a user profile.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct ProfileInfo<T: Config> {
	/// IPFS CID pointing to profile metadata JSON (name, bio, avatar, links, etc.).
	pub metadata: BoundedVec<u8, T::MaxMetadataLen>,
	/// Fee that someone must pay to follow this account. 0 = free follows.
	pub follow_fee: BalanceOf<T>,
	/// Block number when the profile was created.
	pub created_at: BlockNumberFor<T>,
}

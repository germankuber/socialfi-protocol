use frame::prelude::*;

use super::pallet::Config;

/// On-chain record for a user profile.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct ProfileInfo<T: Config> {
	/// IPFS CID pointing to profile metadata JSON (name, bio, avatar, links, etc.).
	pub metadata: BoundedVec<u8, T::MaxMetadataLen>,
	/// Block number when the profile was created.
	pub created_at: BlockNumberFor<T>,
}

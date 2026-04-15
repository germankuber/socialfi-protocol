use frame::prelude::*;

use super::pallet::Config;

/// Status of a registered app.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum AppStatus {
	Active,
	Inactive,
}

/// On-chain record for a registered social app.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct AppInfo<T: Config> {
	/// Who registered this app.
	pub owner: T::AccountId,
	/// IPFS CID pointing to app metadata JSON (name, description, logo, url, etc.).
	pub metadata: BoundedVec<u8, T::MaxMetadataLen>,
	/// Whether this app is image-focused (Instagram-style) or text-focused (Twitter-style).
	pub has_images: bool,
	/// Block number when the app was registered.
	pub created_at: BlockNumberFor<T>,
	/// Active or inactive.
	pub status: AppStatus,
}

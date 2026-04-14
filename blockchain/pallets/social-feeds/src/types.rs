use frame::prelude::*;

use super::pallet::{BalanceOf, Config};

/// On-chain record for a post or reply.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct PostInfo<T: Config> {
	/// Author of the post.
	pub author: T::AccountId,
	/// IPFS CID pointing to post content (text, images, video references, etc.).
	pub content: BoundedVec<u8, T::MaxContentLen>,
	/// App this post was created from (None = global post).
	pub app_id: Option<T::AppId>,
	/// If this is a reply, the PostId of the parent post (None = original post).
	pub parent_post: Option<T::PostId>,
	/// Fee that must be paid to reply to this post (set by author, 0 = free replies).
	/// Always 0 for replies.
	pub reply_fee: BalanceOf<T>,
	/// Block number when created.
	pub created_at: BlockNumberFor<T>,
}

use codec::DecodeWithMemTracking;
use frame::prelude::*;

use super::pallet::{BalanceOf, Config};

/// libsodium `crypto_box_seal` output size for a 32-byte message —
/// 32-byte ephemeral pk + 32-byte ciphertext + 16-byte Poly1305 MAC = 80.
pub const SEALED_KEY_LEN: u32 = 80;

/// X25519 public-key length.
pub const X25519_PK_LEN: u32 = 32;

/// Key-service descriptor stored on-chain. The collator publishes its
/// X25519 public key here so sellers can wrap content keys to it.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Clone,
	PartialEq,
	Eq,
	RuntimeDebug,
	TypeInfo,
	MaxEncodedLen,
	serde::Serialize,
	serde::Deserialize,
)]
pub struct KeyServiceInfo<AccountId: codec::Codec> {
	/// Account the collator uses to sign `deliver_unlock_unsigned`.
	pub account: AccountId,
	/// X25519 public key content keys are sealed to.
	pub encryption_pk: [u8; X25519_PK_LEN as usize],
	/// Bumped on rotation.
	pub version: u32,
}

/// Per-unlock record. Created when a viewer pays for a non-public post
/// and their ephemeral X25519 public key is captured. The offchain
/// worker fills `wrapped_key` with the re-sealed content key.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Clone,
	PartialEq,
	Eq,
	RuntimeDebug,
	TypeInfo,
	MaxEncodedLen,
)]
#[scale_info(skip_type_params(T))]
pub struct UnlockRecord<T: Config> {
	/// Viewer's ephemeral X25519 public key.
	pub buyer_pk: [u8; X25519_PK_LEN as usize],
	/// Content key re-sealed to `buyer_pk`. `None` while the OCW
	/// hasn't delivered yet.
	pub wrapped_key: Option<BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN as u32 }>>>,
	/// Block number of the original `unlock_post` call.
	pub requested_at: BlockNumberFor<T>,
}

/// Visibility level of a post.
#[derive(
	Encode,
	Decode,
	Clone,
	PartialEq,
	Eq,
	RuntimeDebug,
	TypeInfo,
	MaxEncodedLen,
	codec::DecodeWithMemTracking,
	Default,
)]
pub enum PostVisibility {
	/// Visible to everyone. Content shown in feeds.
	#[default]
	Public,
	/// Appears in feeds but content is hidden. Pay `unlock_fee` to reveal.
	Obfuscated,
	/// Does not appear in feeds at all. Pay `unlock_fee` to access.
	Private,
}

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
	/// Visibility level of the post.
	pub visibility: PostVisibility,
	/// Fee to unlock obfuscated/private content. Transferred to author on unlock.
	/// Only meaningful when visibility is Obfuscated or Private.
	pub unlock_fee: BalanceOf<T>,
	/// Block number when created.
	pub created_at: BlockNumberFor<T>,
	/// If the post has been redacted by an app moderator, records who did
	/// it so the UI can show a "redacted" overlay while keeping the
	/// original author visible for appeals and audits.
	pub redacted_by: Option<T::AccountId>,
	/// Sealed-box of the content encryption key wrapped to the
	/// key-service's X25519 public key. `Some` iff the post is
	/// `Obfuscated` or `Private`: readers must pay `unlock_fee` and wait
	/// for the offchain worker to re-seal this capsule to their
	/// ephemeral public key before they can decrypt the IPFS payload.
	pub capsule: Option<BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN as u32 }>>>,
}

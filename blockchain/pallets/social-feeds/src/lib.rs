//! # Social Feeds Pallet
//!
//! Global feeds system for the SocialFi protocol — posts and replies shared
//! across all registered apps. Posts can be public, obfuscated, or private.
//!
//! - **Public**: visible to everyone in feeds, content shown.
//! - **Obfuscated**: appears in feeds but content is hidden. Pay `unlock_fee` to reveal.
//! - **Private**: does not appear in feeds. Pay `unlock_fee` to access.
//!
//! Posts are immutable and permanent — no editing, no deleting.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod types;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub mod weights;

pub mod dev_key;

pub mod offchain;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

/// Trait that other pallets use to read post data.
pub trait PostProvider<AccountId, PostId> {
	fn get_author(post_id: &PostId) -> Option<AccountId>;
	fn exists(post_id: &PostId) -> bool;
}

/// Runtime-supplied helpers used only by the benchmark suite. The
/// benchmarks need cheap setup primitives for prerequisites managed by
/// *other* pallets (profile registration, app registration) so those
/// costs don't leak into the weights of the extrinsics we are actually
/// measuring. The unit impl panics on purpose — a runtime with feeds
/// benchmarks must wire a real helper.
#[cfg(feature = "runtime-benchmarks")]
pub trait BenchmarkHelper<AccountId, AppId> {
	fn register_profile(who: &AccountId);
	fn register_app(owner: &AccountId) -> AppId;
}

#[cfg(feature = "runtime-benchmarks")]
impl<AccountId, AppId> BenchmarkHelper<AccountId, AppId> for () {
	fn register_profile(_who: &AccountId) {
		unimplemented!("wire a concrete BenchmarkHelper in the runtime");
	}
	fn register_app(_owner: &AccountId) -> AppId {
		unimplemented!("wire a concrete BenchmarkHelper in the runtime");
	}
}

/// AppCrypto module for the key-service's offchain signing key. The
/// collator inserts an sr25519 key with `KeyTypeId(*b"p2dc")` into its
/// local keystore (via `author_insertKey` or a dev genesis shortcut);
/// the offchain worker signs the `DeliverUnlockPayload` with it and the
/// on-chain `validate_unsigned` checks the signature against this key.
pub mod crypto {
	use frame::deps::sp_runtime::{
		app_crypto::{app_crypto, sr25519},
		KeyTypeId, MultiSignature, MultiSigner,
	};

	pub const KEY_TYPE: KeyTypeId = KeyTypeId(*b"p2dc");
	app_crypto!(sr25519, KEY_TYPE);

	pub struct AuthorityId;
	impl frame::deps::frame_system::offchain::AppCrypto<MultiSigner, MultiSignature>
		for AuthorityId
	{
		type RuntimeAppPublic = Public;
		type GenericSignature = frame::deps::sp_core::sr25519::Signature;
		type GenericPublic = frame::deps::sp_core::sr25519::Public;
	}
}

#[frame::pallet]
pub mod pallet {
	use crate::{
		types::{
			KeyServiceInfo, PostInfo, PostVisibility, UnlockRecord, SEALED_KEY_LEN, X25519_PK_LEN,
		},
		weights::WeightInfo,
		PostProvider,
	};
	use codec::{Decode, DecodeWithMemTracking, Encode};
	use frame::{
		deps::{
			frame_support::pallet_prelude::{TransactionSource, ValidTransaction},
			sp_runtime::{
				traits::Saturating,
				transaction_validity::{InvalidTransaction, TransactionValidity},
			},
		},
		prelude::*,
		traits::{Currency, ExistenceRequirement},
	};
	use frame::deps::frame_system::offchain::{
		AppCrypto, CreateBare, CreateSignedTransaction, SignedPayload, SigningTypes,
	};
	use pallet_social_app_registry::AppProvider;
	use pallet_social_profiles::ProfileProvider;
	use scale_info::{prelude::vec::Vec, TypeInfo};

	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	/// Custom error codes returned by `validate_unsigned`.
	pub mod unsigned_error {
		pub const KEY_SERVICE_NOT_SET: u8 = 101;
		pub const SIGNER_NOT_KEY_SERVICE: u8 = 102;
		pub const STALE_PAYLOAD: u8 = 103;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// Signed payload carried by `deliver_unlock_unsigned`. The collator
	/// OCW fills this in, signs it with its `AuthorityId`, and the on-chain
	/// `validate_unsigned` verifies the signature + freshness window.
	///
	/// `Clone`, `PartialEq`, `Eq` use the `*NoBound` derives so the impls
	/// apply without forcing `T: Clone + PartialEq + Eq`. `Debug` stays
	/// hand-written on purpose: `DebugNoBound` prints every field, and
	/// `wrapped_key` + `viewer` should not land in logs.
	#[derive(
		Encode,
		Decode,
		DecodeWithMemTracking,
		TypeInfo,
		CloneNoBound,
		PartialEqNoBound,
		EqNoBound,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct DeliverUnlockPayload<T: Config> {
		pub public: T::Public,
		pub block_number: BlockNumberFor<T>,
		pub post_id: T::PostId,
		pub viewer: T::AccountId,
		pub wrapped_key: BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN }>>,
	}

	impl<T: Config> core::fmt::Debug for DeliverUnlockPayload<T> {
		fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
			f.debug_struct("DeliverUnlockPayload")
				.field("block_number", &self.block_number)
				.finish_non_exhaustive()
		}
	}

	impl<T: Config> SignedPayload<T> for DeliverUnlockPayload<T>
	where
		T: SigningTypes,
	{
		fn public(&self) -> T::Public {
			self.public.clone()
		}
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config + CreateSignedTransaction<Call<Self>> + CreateBare<Call<Self>>
	{
		/// Post ID type (u64 for large capacity).
		type PostId: Member
			+ Parameter
			+ MaxEncodedLen
			+ Copy
			+ Default
			+ Ord
			+ frame::traits::One
			+ frame::traits::CheckedAdd
			+ core::ops::AddAssign
			+ From<u64>
			+ Into<u64>;

		/// App ID type (must match pallet-social-app-registry).
		type AppId: Member + Parameter + MaxEncodedLen + Copy;

		/// Currency for fee transfers.
		type Currency: Currency<Self::AccountId>;

		/// Fee to create a post (transferred to app owner or treasury).
		#[pallet::constant]
		type PostFee: Get<BalanceOf<Self>>;

		/// Treasury account that receives fees from global posts.
		type TreasuryAccount: Get<Self::AccountId>;

		/// Profile existence checker.
		type ProfileProvider: ProfileProvider<Self::AccountId, BalanceOf<Self>>;

		/// App info provider.
		type AppProvider: AppProvider<Self::AccountId, Self::AppId>;

		/// Max length of content CID.
		#[pallet::constant]
		type MaxContentLen: Get<u32>;

		/// Max posts per author.
		#[pallet::constant]
		type MaxPostsPerAuthor: Get<u32>;

		/// Max replies per post.
		#[pallet::constant]
		type MaxRepliesPerPost: Get<u32>;

		/// Origin authorised to redact posts on moderation grounds. In
		/// the runtime this is wired to the custom `AppModerator` origin
		/// emitted by `pallet-social-app-registry`: the guard yields
		/// `(app_id, moderator)` so we can verify the post being redacted
		/// actually belongs to that app before applying the state change.
		type ModerationOrigin: EnsureOrigin<
			<Self as frame_system::Config>::RuntimeOrigin,
			Success = (Self::AppId, Self::AccountId),
		>;

		/// Offchain authority used by the collator to sign
		/// `DeliverUnlockPayload` inside `deliver_unlock_unsigned`.
		type AuthorityId: AppCrypto<Self::Public, Self::Signature>;

		/// Origin authorised to set / rotate the key service. Typically
		/// `EnsureRoot` in dev (sudo), governance in production.
		type AdminOrigin: EnsureOrigin<Self::RuntimeOrigin>;

		/// How many blocks an unsigned delivery payload is valid for.
		#[pallet::constant]
		type UnsignedValidityWindow: Get<BlockNumberFor<Self>>;

		/// Transaction-pool priority for unsigned deliveries.
		#[pallet::constant]
		type UnsignedPriority: Get<
			frame::deps::sp_runtime::transaction_validity::TransactionPriority,
		>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;

		/// Benchmark-only helpers. The runtime provides an impl that
		/// short-circuits `ProfileProvider` / `AppProvider` guard checks
		/// — benchmarks cannot call `pallet-social-profiles::create_profile`
		/// directly because doing so would bake the cost of *that*
		/// pallet into every feeds benchmark.
		#[cfg(feature = "runtime-benchmarks")]
		type BenchmarkHelper: crate::BenchmarkHelper<Self::AccountId, Self::AppId>;
	}

	/// Auto-incrementing Post ID counter.
	#[pallet::storage]
	pub type NextPostId<T: Config> = StorageValue<_, T::PostId, ValueQuery>;

	/// Main post storage: PostId -> PostInfo.
	#[pallet::storage]
	pub type Posts<T: Config> = StorageMap<_, Blake2_128Concat, T::PostId, PostInfo<T>>;

	/// Posts by author: AccountId -> BoundedVec<PostId>.
	#[pallet::storage]
	pub type PostsByAuthor<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		BoundedVec<T::PostId, T::MaxPostsPerAuthor>,
		ValueQuery,
	>;

	/// Replies to a post: PostId -> BoundedVec<PostId>.
	#[pallet::storage]
	pub type Replies<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::PostId,
		BoundedVec<T::PostId, T::MaxRepliesPerPost>,
		ValueQuery,
	>;

	/// Timeline index: (author, (block_number, post_id)) -> ().
	///
	/// Secondary index that complements `PostsByAuthor` (which stores a
	/// flat `BoundedVec` and forces callers to download everything to
	/// paginate). Using `Twox64Concat` on the inner `(block, post_id)`
	/// tuple is safe because the block-number/post-id are not user
	/// supplied and the key space is sparse per author — no second
	/// pre-image concerns, and the concat variant keeps the raw key
	/// suffix available so iteration yields the decoded tuple.
	///
	/// Callers paginate via `Pallet::posts_timeline(author, from, to, limit)`
	/// which returns entries newest-first by collecting and sorting the
	/// keys for that author. With `MaxPostsPerAuthor` bounded, the cost is
	/// bounded too; the win is that off-chain clients can ask for just
	/// the slice they need without re-fetching the full vec.
	#[pallet::storage]
	pub type PostsTimeline<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		Twox64Concat,
		(BlockNumberFor<T>, T::PostId),
		(),
		OptionQuery,
	>;

	/// Per-viewer unlock records. Keyed by `(post_id, viewer)` — the
	/// post_id first lets the OCW iterate unlocks for a given post
	/// cheaply. A `None` `wrapped_key` means "payment received, waiting
	/// for the collator to deliver".
	#[pallet::storage]
	pub type Unlocks<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		T::PostId,
		Blake2_128Concat,
		T::AccountId,
		UnlockRecord<T>,
		OptionQuery,
	>;

	/// Index of unlocks still awaiting key delivery. The OCW iterates
	/// this map to find work. A present key == pending; it is removed
	/// when the key is delivered.
	#[pallet::storage]
	pub type PendingUnlocks<T: Config> =
		StorageMap<_, Blake2_128Concat, (T::PostId, T::AccountId), (), OptionQuery>;

	/// On-chain record of the custodial key service (collator).
	#[pallet::storage]
	pub type KeyService<T: Config> =
		StorageValue<_, KeyServiceInfo<T::AccountId>, OptionQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new post was created.
		PostCreated {
			post_id: T::PostId,
			author: T::AccountId,
			app_id: Option<T::AppId>,
			visibility: PostVisibility,
			post_fee: BalanceOf<T>,
			fee_recipient: T::AccountId,
		},
		/// A reply was created.
		ReplyCreated {
			post_id: T::PostId,
			parent_post_id: T::PostId,
			author: T::AccountId,
			parent_author: T::AccountId,
			app_id: Option<T::AppId>,
			reply_fee_paid: BalanceOf<T>,
			post_fee_paid: BalanceOf<T>,
			fee_recipient: T::AccountId,
		},
		/// A post was unlocked by a viewer (fee paid to author).
		PostUnlocked {
			post_id: T::PostId,
			viewer: T::AccountId,
			author: T::AccountId,
			fee_paid: BalanceOf<T>,
		},
		/// An app moderator redacted a post. The record is kept (author
		/// stays visible for appeals) but clients are expected to render
		/// the content as removed.
		PostRedacted {
			post_id: T::PostId,
			app_id: T::AppId,
			moderator: T::AccountId,
		},
		/// The admin configured (or rotated) the key service.
		///
		/// Observers can diff `previous_account` vs `account` to detect
		/// rotations, and bind `version` to the X25519 public key so
		/// clients know which pk to use for new capsules.
		KeyServiceUpdated {
			version: u32,
			account: T::AccountId,
			previous_account: Option<T::AccountId>,
		},
		/// The collator OCW delivered a wrapped key for a pending unlock.
		UnlockKeyDelivered { post_id: T::PostId, viewer: T::AccountId },
		/// The author called `unlock_post` on their own post. No state
		/// change, no fee — they already have implicit access — but we
		/// emit so clients get a deterministic acknowledgement instead
		/// of a silent `Ok`.
		AuthorSelfUnlockAcknowledged { post_id: T::PostId, author: T::AccountId },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The caller does not have a profile.
		ProfileNotFound,
		/// The specified app does not exist or is inactive.
		AppNotFound,
		/// The parent post does not exist.
		ParentPostNotFound,
		/// The caller does not have enough balance to pay the fee.
		InsufficientBalance,
		/// The provided content exceeds the maximum allowed length.
		ContentTooLong,
		/// The author has reached the maximum number of posts.
		TooManyPosts,
		/// The parent post has reached the maximum number of replies.
		TooManyReplies,
		/// The post ID counter has overflowed.
		PostIdOverflow,
		/// The post does not exist.
		PostNotFound,
		/// The post is already unlocked by this viewer.
		AlreadyUnlocked,
		/// The post is public and does not need unlocking.
		PostIsPublic,
		/// The post does not belong to the app whose moderator is
		/// attempting to redact it.
		PostNotInApp,
		/// The post is already redacted — repeated redactions are no-ops.
		AlreadyRedacted,
		/// Non-public posts must ship a `capsule` of the exact sealed-box
		/// length; public posts must not carry one.
		CapsuleInvalid,
		/// The ephemeral X25519 public key provided by the viewer is
		/// malformed (e.g. all zeros).
		InvalidBuyerPk,
		/// The key service is not configured on-chain yet.
		KeyServiceNotConfigured,
		/// Wrapped key delivered by the OCW was not the expected length.
		WrappedKeyInvalid,
		/// Tried to deliver for an unlock record that does not exist or
		/// already has a wrapped key.
		UnlockNotPending,
	}

	impl<T: Config> PostProvider<T::AccountId, T::PostId> for Pallet<T> {
		fn get_author(post_id: &T::PostId) -> Option<T::AccountId> {
			Posts::<T>::get(post_id).map(|p| p.author)
		}

		fn exists(post_id: &T::PostId) -> bool {
			Posts::<T>::contains_key(post_id)
		}
	}

	/// Genesis configuration for the pallet.
	///
	/// `key_service` (optional) lets a chainspec pre-register the
	/// custodial collator account + X25519 public key so the OCW can
	/// start delivering encrypted-post unlocks from block 1 with no
	/// manual sudo ceremony. For dev chainspecs we wire this up to the
	/// deterministic Alice key; production deployments leave it `None`
	/// and register via governance later.
	#[pallet::genesis_config]
	#[derive(frame::deps::frame_support::DefaultNoBound)]
	pub struct GenesisConfig<T: Config> {
		pub key_service: Option<KeyServiceInfo<T::AccountId>>,
	}

	#[pallet::genesis_build]
	impl<T: Config> BuildGenesisConfig for GenesisConfig<T> {
		fn build(&self) {
			if let Some(ks) = &self.key_service {
				log::info!(
					target: "social-feeds",
					"🔑 GENESIS: registering key service version={} account={:?} pk={:02x?}",
					ks.version, ks.account, &ks.encryption_pk[..8],
				);
				KeyService::<T>::put(ks.clone());
			}
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a new original post.
		///
		/// `visibility`: Public, Obfuscated, or Private.
		/// `unlock_fee`: fee to unlock content (only for Obfuscated/Private, ignored for Public).
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::create_post(T::MaxPostsPerAuthor::get()))]
		pub fn create_post(
			origin: OriginFor<T>,
			content: BoundedVec<u8, T::MaxContentLen>,
			app_id: Option<T::AppId>,
			reply_fee: BalanceOf<T>,
			visibility: PostVisibility,
			unlock_fee: BalanceOf<T>,
			capsule: Option<BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN }>>>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);

			// Enforce capsule invariants tied to visibility:
			//  * Public posts must never carry a capsule (the content is
			//    plaintext anyway, a capsule would be misleading data).
			//  * Non-public posts MUST carry a capsule whose length matches
			//    the sealed-box size. Zero-capsule posts would be silently
			//    undecryptable, which is worse than failing fast.
			match (&visibility, &capsule) {
				(PostVisibility::Public, None) => {},
				(PostVisibility::Public, Some(_)) => return Err(Error::<T>::CapsuleInvalid.into()),
				(_, Some(c)) if c.len() as u32 == SEALED_KEY_LEN => {},
				_ => return Err(Error::<T>::CapsuleInvalid.into()),
			}
			if capsule.is_some() {
				// The chain must know where to direct the OCW's sealed
				// box; a post cannot ship a capsule before the admin has
				// configured a key service.
				ensure!(KeyService::<T>::exists(), Error::<T>::KeyServiceNotConfigured);
				log::info!(
					target: "social-feeds",
					"📝 encrypted create_post author={:?} visibility={:?} capsule_len={}",
					who, visibility, capsule.as_ref().map(|c| c.len()).unwrap_or(0),
				);
			}

			let fee_recipient = Self::resolve_fee_recipient(&app_id)?;

			let post_id = NextPostId::<T>::get();
			let next_id =
				post_id.checked_add(&T::PostId::one()).ok_or(Error::<T>::PostIdOverflow)?;

			let mut author_posts = PostsByAuthor::<T>::get(&who);
			author_posts.try_push(post_id).map_err(|_| Error::<T>::TooManyPosts)?;

			// For public posts, unlock_fee is forced to 0.
			let actual_unlock_fee =
				if visibility == PostVisibility::Public { Zero::zero() } else { unlock_fee };

			let block_number = frame_system::Pallet::<T>::block_number();
			let post = PostInfo {
				author: who.clone(),
				content,
				app_id,
				parent_post: None,
				reply_fee,
				visibility: visibility.clone(),
				unlock_fee: actual_unlock_fee,
				created_at: block_number,
				redacted_by: None,
				capsule,
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, post);
			PostsByAuthor::<T>::insert(&who, author_posts);
			PostsTimeline::<T>::insert(&who, (block_number, post_id), ());

			T::Currency::transfer(
				&who,
				&fee_recipient,
				T::PostFee::get(),
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientBalance)?;

			Self::deposit_event(Event::PostCreated {
				post_id,
				author: who,
				app_id,
				visibility,
				post_fee: T::PostFee::get(),
				fee_recipient,
			});
			Ok(())
		}

		/// Create a reply to an existing post.
		///
		/// Replies are always public with visibility Public.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::create_reply(T::MaxPostsPerAuthor::get()))]
		pub fn create_reply(
			origin: OriginFor<T>,
			parent_post_id: T::PostId,
			content: BoundedVec<u8, T::MaxContentLen>,
			app_id: Option<T::AppId>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);

			let parent = Posts::<T>::get(parent_post_id).ok_or(Error::<T>::ParentPostNotFound)?;

			let fee_recipient = Self::resolve_fee_recipient(&app_id)?;

			let post_id = NextPostId::<T>::get();
			let next_id =
				post_id.checked_add(&T::PostId::one()).ok_or(Error::<T>::PostIdOverflow)?;

			let mut author_posts = PostsByAuthor::<T>::get(&who);
			author_posts.try_push(post_id).map_err(|_| Error::<T>::TooManyPosts)?;

			let mut parent_replies = Replies::<T>::get(parent_post_id);
			parent_replies.try_push(post_id).map_err(|_| Error::<T>::TooManyReplies)?;

			let block_number = frame_system::Pallet::<T>::block_number();
			let reply = PostInfo {
				author: who.clone(),
				content,
				app_id,
				parent_post: Some(parent_post_id),
				reply_fee: Zero::zero(),
				visibility: PostVisibility::Public,
				unlock_fee: Zero::zero(),
				created_at: block_number,
				redacted_by: None,
				capsule: None,
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, reply);
			PostsByAuthor::<T>::insert(&who, author_posts);
			PostsTimeline::<T>::insert(&who, (block_number, post_id), ());
			Replies::<T>::insert(parent_post_id, parent_replies);

			if parent.reply_fee > Zero::zero() {
				T::Currency::transfer(
					&who,
					&parent.author,
					parent.reply_fee,
					ExistenceRequirement::KeepAlive,
				)
				.map_err(|_| Error::<T>::InsufficientBalance)?;
			}

			T::Currency::transfer(
				&who,
				&fee_recipient,
				T::PostFee::get(),
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientBalance)?;

			Self::deposit_event(Event::ReplyCreated {
				post_id,
				parent_post_id,
				author: who,
				parent_author: parent.author,
				app_id,
				reply_fee_paid: parent.reply_fee,
				post_fee_paid: T::PostFee::get(),
				fee_recipient,
			});
			Ok(())
		}

		/// Unlock a non-public post.
		///
		/// The viewer pays `unlock_fee` to the author and registers an
		/// ephemeral X25519 public key. Payment alone does not hand over
		/// the content key: the pallet enqueues an [`UnlockRecord`] with
		/// `wrapped_key = None`, and the collator's offchain worker
		/// eventually re-seals the content key to `buyer_pk` and submits
		/// `deliver_unlock_unsigned`. The viewer polls until
		/// `wrapped_key.is_some()` and then decrypts locally.
		///
		/// The author keeps implicit access — if the caller is the
		/// author, we short-circuit without creating an unlock record.
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::unlock_post())]
		pub fn unlock_post(
			origin: OriginFor<T>,
			post_id: T::PostId,
			buyer_pk: [u8; X25519_PK_LEN as usize],
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(buyer_pk != [0u8; X25519_PK_LEN as usize], Error::<T>::InvalidBuyerPk);

			let post = Posts::<T>::get(post_id).ok_or(Error::<T>::PostNotFound)?;
			ensure!(post.visibility != PostVisibility::Public, Error::<T>::PostIsPublic);

			if who == post.author {
				Self::deposit_event(Event::AuthorSelfUnlockAcknowledged {
					post_id,
					author: who,
				});
				return Ok(());
			}

			ensure!(!Unlocks::<T>::contains_key(post_id, &who), Error::<T>::AlreadyUnlocked);

			if post.unlock_fee > Zero::zero() {
				T::Currency::transfer(
					&who,
					&post.author,
					post.unlock_fee,
					ExistenceRequirement::KeepAlive,
				)
				.map_err(|_| Error::<T>::InsufficientBalance)?;
			}

			let now = frame_system::Pallet::<T>::block_number();
			Unlocks::<T>::insert(
				post_id,
				&who,
				UnlockRecord::<T> { buyer_pk, wrapped_key: None, requested_at: now },
			);
			PendingUnlocks::<T>::insert((post_id, who.clone()), ());

			log::info!(
				target: "social-feeds",
				"💰 unlock_post paid post_id={:?} viewer={:?} fee={:?} buyer_pk={:02x?}",
				post_id, who, post.unlock_fee, &buyer_pk[..8],
			);

			Self::deposit_event(Event::PostUnlocked {
				post_id,
				viewer: who,
				author: post.author,
				fee_paid: post.unlock_fee,
			});
			Ok(())
		}

		/// Admin entry point to publish / rotate the key service (the
		/// custodial collator's X25519 pk + signer account).
		#[pallet::call_index(4)]
		#[pallet::weight(T::WeightInfo::set_key_service())]
		pub fn set_key_service(
			origin: OriginFor<T>,
			account: T::AccountId,
			encryption_pk: [u8; X25519_PK_LEN as usize],
		) -> DispatchResult {
			T::AdminOrigin::ensure_origin(origin)?;
			ensure!(encryption_pk != [0u8; X25519_PK_LEN as usize], Error::<T>::InvalidBuyerPk);
			let existing = KeyService::<T>::get();
			let previous_account = existing.as_ref().map(|ks| ks.account.clone());
			let next_version = existing.map(|ks| ks.version.saturating_add(1)).unwrap_or(1);
			KeyService::<T>::put(KeyServiceInfo {
				account: account.clone(),
				encryption_pk,
				version: next_version,
			});
			Self::deposit_event(Event::KeyServiceUpdated {
				version: next_version,
				account,
				previous_account,
			});
			Ok(())
		}

		/// Unsigned extrinsic submitted by the collator OCW to hand a
		/// re-sealed content key to the viewer. See the `validate_unsigned`
		/// block for the pool-level validation rules.
		#[pallet::call_index(5)]
		#[pallet::weight(T::WeightInfo::deliver_unlock_unsigned())]
		pub fn deliver_unlock_unsigned(
			origin: OriginFor<T>,
			payload: DeliverUnlockPayload<T>,
			_signature: T::Signature,
		) -> DispatchResult {
			ensure_none(origin)?;

			ensure!(
				payload.wrapped_key.len() as u32 == SEALED_KEY_LEN,
				Error::<T>::WrappedKeyInvalid,
			);

			Unlocks::<T>::try_mutate(
				payload.post_id,
				&payload.viewer,
				|maybe_record| -> DispatchResult {
					let record = maybe_record.as_mut().ok_or(Error::<T>::UnlockNotPending)?;
					ensure!(record.wrapped_key.is_none(), Error::<T>::UnlockNotPending);
					record.wrapped_key = Some(payload.wrapped_key.clone());
					Ok(())
				},
			)?;
			PendingUnlocks::<T>::remove((payload.post_id, payload.viewer.clone()));

			log::info!(
				target: "social-feeds",
				"🔓 deliver_unlock_unsigned accepted post_id={:?} viewer={:?} wrapped_key_len={}",
				payload.post_id, payload.viewer, payload.wrapped_key.len(),
			);

			Self::deposit_event(Event::UnlockKeyDelivered {
				post_id: payload.post_id,
				viewer: payload.viewer,
			});
			Ok(())
		}

		/// Redact a post from an app. The dispatch is gated by
		/// `T::ModerationOrigin`, which in the runtime is wired to
		/// `EnsureAppModerator` — the guard yields `(app_id, moderator)`
		/// and we verify the post actually belongs to that app before
		/// applying the state change.
		///
		/// This is the primary demonstration of `#[pallet::origin]` in
		/// this runtime: authority (`moderator` can redact posts in
		/// `app_id`) is carried in the origin itself, so this extrinsic
		/// can trust the guard without any re-lookup into the app
		/// registry.
		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::redact_post())]
		pub fn redact_post(
			origin: OriginFor<T>,
			post_id: T::PostId,
		) -> DispatchResult {
			let (authorized_app, moderator) = T::ModerationOrigin::ensure_origin(origin)?;

			Posts::<T>::try_mutate(post_id, |maybe_post| -> DispatchResult {
				let post = maybe_post.as_mut().ok_or(Error::<T>::PostNotFound)?;
				ensure!(post.redacted_by.is_none(), Error::<T>::AlreadyRedacted);
				ensure!(
					post.app_id == Some(authorized_app),
					Error::<T>::PostNotInApp,
				);
				post.redacted_by = Some(moderator.clone());
				Ok(())
			})?;

			Self::deposit_event(Event::PostRedacted {
				post_id,
				app_id: authorized_app,
				moderator,
			});
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		/// Paginate an author's timeline newest-first.
		///
		/// `from` / `to` are inclusive block-number bounds; `None` means
		/// unbounded in that direction. `limit` caps the returned slice.
		/// Intended for runtime APIs and off-chain indexers — the plain
		/// `PostsByAuthor` vec forces clients to download every post just
		/// to render the latest N, which scales poorly.
		pub fn posts_timeline(
			author: &T::AccountId,
			from: Option<BlockNumberFor<T>>,
			to: Option<BlockNumberFor<T>>,
			limit: u32,
		) -> Vec<(BlockNumberFor<T>, T::PostId)> {
			let mut keys: Vec<(BlockNumberFor<T>, T::PostId)> =
				PostsTimeline::<T>::iter_key_prefix(author)
					.filter(|(block, _)| {
						from.map_or(true, |lo| *block >= lo)
							&& to.map_or(true, |hi| *block <= hi)
					})
					.collect();
			// Newest first by (block, post_id). post_id tiebreaks in the
			// rare case two posts share a block.
			keys.sort_unstable_by(|a, b| b.cmp(a));
			keys.truncate(limit as usize);
			keys
		}

		fn resolve_fee_recipient(app_id: &Option<T::AppId>) -> Result<T::AccountId, DispatchError> {
			match app_id {
				Some(id) => {
					T::AppProvider::get_owner(id).ok_or_else(|| Error::<T>::AppNotFound.into())
				},
				None => Ok(T::TreasuryAccount::get()),
			}
		}

		/// Pure validation helper used by `validate_unsigned`. Extracted
		/// so the logic is reusable if we later migrate to
		/// `#[pallet::authorize]` (post-stable2512).
		pub(crate) fn validate_delivery(call: &Call<T>) -> TransactionValidity {
			let (payload, signature) = match call {
				Call::deliver_unlock_unsigned { payload, signature } => (payload, signature),
				_ => return InvalidTransaction::Call.into(),
			};

			// 1. Freshness window.
			let now = frame_system::Pallet::<T>::block_number();
			let window = T::UnsignedValidityWindow::get();
			if payload.block_number > now
				|| now.saturating_sub(payload.block_number) > window
			{
				return InvalidTransaction::Custom(unsigned_error::STALE_PAYLOAD).into();
			}

			// 2. Signature.
			let valid = SignedPayload::<T>::verify::<T::AuthorityId>(payload, signature.clone());
			if !valid {
				return InvalidTransaction::BadProof.into();
			}

			// 3. Signer must be the current key service.
			let ks = KeyService::<T>::get().ok_or_else(|| {
				InvalidTransaction::Custom(unsigned_error::KEY_SERVICE_NOT_SET)
			})?;
			let signer: T::AccountId = payload.public.clone().into_account();
			if signer != ks.account {
				return InvalidTransaction::Custom(unsigned_error::SIGNER_NOT_KEY_SERVICE).into();
			}

			// 4. Dedup tag per (post_id, viewer).
			let tag = (b"feeds-unlock", payload.post_id, payload.viewer.clone()).encode();

			ValidTransaction::with_tag_prefix("social-feeds-unlock")
				.priority(T::UnsignedPriority::get())
				.and_provides(tag)
				.longevity(window.saturated_into::<u64>())
				.propagate(true)
				.build()
		}
	}

	#[pallet::validate_unsigned]
	impl<T: Config> ValidateUnsigned for Pallet<T> {
		type Call = Call<T>;

		fn validate_unsigned(
			source: TransactionSource,
			call: &Self::Call,
		) -> TransactionValidity {
			// Only accept from a local OCW or in-block propagation — stops
			// external peers from flooding the pool with speculative keys.
			if !matches!(source, TransactionSource::Local | TransactionSource::InBlock) {
				return InvalidTransaction::Call.into();
			}
			let res = Pallet::<T>::validate_delivery(call);
			log::debug!(
				target: "social-feeds::validate",
				"validate_unsigned source={:?} ok={}", source, res.is_ok(),
			);
			res
		}
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		fn offchain_worker(block_number: BlockNumberFor<T>) {
			crate::offchain::run::<T>(block_number);
		}
	}

	/// View functions — typed read queries exposed via the
	/// `RuntimeViewFunction` runtime API. Off-chain clients (frontend,
	/// CLI, indexers) invoke them directly over RPC without submitting
	/// an extrinsic: no fee, no block, no signature required.
	///
	/// These are the public read surface of the pallet. Storage reads
	/// elsewhere stay internal; anything a client needs to paginate,
	/// hydrate or look up goes through here so the API is stable while
	/// the storage layout can evolve.
	#[pallet::view_functions]
	impl<T: Config> Pallet<T> {
		/// Fetch a single post with all its metadata. Returns `None` when
		/// the post does not exist or was never created.
		pub fn post_by_id(post_id: T::PostId) -> Option<PostInfo<T>> {
			Posts::<T>::get(post_id)
		}

		/// How many posts the author has ever created (including replies).
		/// Cheap — reads the `PostsByAuthor` length without hydrating the
		/// actual post records. View function args must implement
		/// `Decode` so the SCALE runtime API can dispatch them, which is
		/// why this takes `AccountId` by value rather than by reference.
		pub fn author_post_count(author: T::AccountId) -> u32 {
			PostsByAuthor::<T>::get(&author).len() as u32
		}

		/// Paginated author feed, newest first, with posts hydrated in a
		/// single round-trip. The off-chain client picks a block window
		/// (`from`, `to`) and a page size (`limit`) and receives the full
		/// `PostInfo` alongside each id — no second call needed.
		///
		/// Unknown authors return an empty vec. Holes (post_id present in
		/// the timeline index but missing from `Posts`) are skipped
		/// silently; that state is not reachable in this pallet today
		/// but the filter keeps the view robust to future cleanup paths.
		pub fn feed_by_author(
			author: T::AccountId,
			from: Option<BlockNumberFor<T>>,
			to: Option<BlockNumberFor<T>>,
			limit: u32,
		) -> Vec<(T::PostId, PostInfo<T>)> {
			Self::posts_timeline(&author, from, to, limit)
				.into_iter()
				.filter_map(|(_, post_id)| {
					Posts::<T>::get(post_id).map(|info| (post_id, info))
				})
				.collect()
		}
	}
}

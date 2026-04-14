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

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

/// Trait that other pallets use to read post data.
pub trait PostProvider<AccountId, PostId> {
	fn get_author(post_id: &PostId) -> Option<AccountId>;
	fn exists(post_id: &PostId) -> bool;
}

#[frame::pallet]
pub mod pallet {
	use crate::{
		types::{PostInfo, PostVisibility},
		weights::WeightInfo,
		PostProvider,
	};
	use frame::{
		prelude::*,
		traits::{Currency, ExistenceRequirement},
	};
	use pallet_social_app_registry::AppProvider;
	use pallet_social_profiles::ProfileProvider;

	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Post ID type (u64 for large capacity).
		type PostId: Member
			+ Parameter
			+ MaxEncodedLen
			+ Copy
			+ Default
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
		type ProfileProvider: ProfileProvider<Self::AccountId>;

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

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
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

	/// Tracks which accounts have unlocked which posts.
	/// (viewer, post_id) -> true if unlocked.
	#[pallet::storage]
	pub type UnlockedPosts<T: Config> =
		StorageDoubleMap<_, Blake2_128Concat, T::AccountId, Blake2_128Concat, T::PostId, bool>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new post was created.
		PostCreated {
			post_id: T::PostId,
			author: T::AccountId,
			app_id: Option<T::AppId>,
			visibility: PostVisibility,
		},
		/// A reply was created.
		ReplyCreated {
			post_id: T::PostId,
			parent_post_id: T::PostId,
			author: T::AccountId,
			app_id: Option<T::AppId>,
		},
		/// A post was unlocked by a viewer (fee paid to author).
		PostUnlocked { post_id: T::PostId, viewer: T::AccountId, fee_paid: BalanceOf<T> },
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
	}

	impl<T: Config> PostProvider<T::AccountId, T::PostId> for Pallet<T> {
		fn get_author(post_id: &T::PostId) -> Option<T::AccountId> {
			Posts::<T>::get(post_id).map(|p| p.author)
		}

		fn exists(post_id: &T::PostId) -> bool {
			Posts::<T>::contains_key(post_id)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a new original post.
		///
		/// `visibility`: Public, Obfuscated, or Private.
		/// `unlock_fee`: fee to unlock content (only for Obfuscated/Private, ignored for Public).
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::create_post())]
		pub fn create_post(
			origin: OriginFor<T>,
			content: BoundedVec<u8, T::MaxContentLen>,
			app_id: Option<T::AppId>,
			reply_fee: BalanceOf<T>,
			visibility: PostVisibility,
			unlock_fee: BalanceOf<T>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);

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
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, post);
			PostsByAuthor::<T>::insert(&who, author_posts);

			T::Currency::transfer(
				&who,
				&fee_recipient,
				T::PostFee::get(),
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientBalance)?;

			Self::deposit_event(Event::PostCreated { post_id, author: who, app_id, visibility });
			Ok(())
		}

		/// Create a reply to an existing post.
		///
		/// Replies are always public with visibility Public.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::create_reply())]
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
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, reply);
			PostsByAuthor::<T>::insert(&who, author_posts);
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
				app_id,
			});
			Ok(())
		}

		/// Unlock an obfuscated or private post by paying the unlock fee to the author.
		///
		/// After unlocking, the viewer can see the content. The author of a post
		/// always has access without needing to unlock.
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::create_post())]
		pub fn unlock_post(origin: OriginFor<T>, post_id: T::PostId) -> DispatchResult {
			let who = ensure_signed(origin)?;

			let post = Posts::<T>::get(post_id).ok_or(Error::<T>::PostNotFound)?;

			ensure!(post.visibility != PostVisibility::Public, Error::<T>::PostIsPublic);

			// Author always has access — no need to pay.
			if who == post.author {
				UnlockedPosts::<T>::insert(&who, post_id, true);
				Self::deposit_event(Event::PostUnlocked {
					post_id,
					viewer: who,
					fee_paid: Zero::zero(),
				});
				return Ok(());
			}

			ensure!(!UnlockedPosts::<T>::contains_key(&who, post_id), Error::<T>::AlreadyUnlocked);

			// Transfer unlock fee to author.
			if post.unlock_fee > Zero::zero() {
				T::Currency::transfer(
					&who,
					&post.author,
					post.unlock_fee,
					ExistenceRequirement::KeepAlive,
				)
				.map_err(|_| Error::<T>::InsufficientBalance)?;
			}

			UnlockedPosts::<T>::insert(&who, post_id, true);

			Self::deposit_event(Event::PostUnlocked {
				post_id,
				viewer: who,
				fee_paid: post.unlock_fee,
			});
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		fn resolve_fee_recipient(app_id: &Option<T::AppId>) -> Result<T::AccountId, DispatchError> {
			match app_id {
				Some(id) => {
					T::AppProvider::get_owner(id).ok_or_else(|| Error::<T>::AppNotFound.into())
				},
				None => Ok(T::TreasuryAccount::get()),
			}
		}
	}
}

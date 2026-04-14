//! # Social Feeds Pallet
//!
//! Global feeds system for the SocialFi protocol — posts and replies shared
//! across all registered apps. Posts can be global or app-scoped. Creating a
//! post costs a fee (transferred to the app owner or protocol treasury).
//! Authors set a reply fee when creating a post; repliers pay that fee to the
//! post author.
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
	use crate::{types::PostInfo, weights::WeightInfo, PostProvider};
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

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new post was created.
		PostCreated { post_id: T::PostId, author: T::AccountId, app_id: Option<T::AppId> },
		/// A reply was created.
		ReplyCreated {
			post_id: T::PostId,
			parent_post_id: T::PostId,
			author: T::AccountId,
			app_id: Option<T::AppId>,
		},
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
		/// All validation and capacity checks happen first. The fee transfer is
		/// the last fallible operation to ensure storage consistency.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::create_post())]
		pub fn create_post(
			origin: OriginFor<T>,
			content: BoundedVec<u8, T::MaxContentLen>,
			app_id: Option<T::AppId>,
			reply_fee: BalanceOf<T>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// 1. Validation — no side effects.
			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);

			let fee_recipient = Self::resolve_fee_recipient(&app_id)?;

			let post_id = NextPostId::<T>::get();
			let next_id =
				post_id.checked_add(&T::PostId::one()).ok_or(Error::<T>::PostIdOverflow)?;

			let mut author_posts = PostsByAuthor::<T>::get(&who);
			author_posts.try_push(post_id).map_err(|_| Error::<T>::TooManyPosts)?;

			// 2. Storage writes (infallible).
			let block_number = frame_system::Pallet::<T>::block_number();
			let post = PostInfo {
				author: who.clone(),
				content,
				app_id,
				parent_post: None,
				reply_fee,
				created_at: block_number,
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, post);
			PostsByAuthor::<T>::insert(&who, author_posts);

			// 3. Fee transfer last.
			T::Currency::transfer(
				&who,
				&fee_recipient,
				T::PostFee::get(),
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientBalance)?;

			Self::deposit_event(Event::PostCreated { post_id, author: who, app_id });
			Ok(())
		}

		/// Create a reply to an existing post.
		///
		/// Pays both the post creation fee (to app owner / treasury) and the
		/// parent post's reply fee (to the parent author). Reply fee of 0 means
		/// no transfer to the parent author.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::create_reply())]
		pub fn create_reply(
			origin: OriginFor<T>,
			parent_post_id: T::PostId,
			content: BoundedVec<u8, T::MaxContentLen>,
			app_id: Option<T::AppId>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// 1. Validation — no side effects.
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

			// 2. Storage writes (infallible).
			let block_number = frame_system::Pallet::<T>::block_number();
			let reply = PostInfo {
				author: who.clone(),
				content,
				app_id,
				parent_post: Some(parent_post_id),
				reply_fee: Zero::zero(),
				created_at: block_number,
			};

			NextPostId::<T>::put(next_id);
			Posts::<T>::insert(post_id, reply);
			PostsByAuthor::<T>::insert(&who, author_posts);
			Replies::<T>::insert(parent_post_id, parent_replies);

			// 3. Fee transfers last.
			// Reply fee to parent post author (skip if zero).
			if parent.reply_fee > Zero::zero() {
				T::Currency::transfer(
					&who,
					&parent.author,
					parent.reply_fee,
					ExistenceRequirement::KeepAlive,
				)
				.map_err(|_| Error::<T>::InsufficientBalance)?;
			}

			// Post creation fee to app owner / treasury.
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
	}

	impl<T: Config> Pallet<T> {
		/// Resolve the fee recipient for a post/reply based on app_id.
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

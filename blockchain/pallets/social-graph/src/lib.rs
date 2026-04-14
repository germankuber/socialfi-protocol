//! # Social Graph Pallet
//!
//! Global social graph for the SocialFi protocol — follow/unfollow relationships
//! shared across all registered apps. Following costs a configurable fee that is
//! transferred directly to the followed account (no refund on unfollow).
//!
//! Both follower and followed must have an existing profile, validated via the
//! `ProfileProvider` trait from `pallet-social-profiles`.
//!
//! Other pallets can query follow relationships via the `GraphProvider` trait.

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

/// Trait that other pallets use to check follow relationships.
pub trait GraphProvider<AccountId> {
	fn is_following(follower: &AccountId, followed: &AccountId) -> bool;
	fn follower_count(account: &AccountId) -> u32;
	fn following_count(account: &AccountId) -> u32;
}

#[frame::pallet]
pub mod pallet {
	use crate::{types::FollowInfo, weights::WeightInfo, GraphProvider};
	use frame::{
		prelude::*,
		traits::{Currency, ExistenceRequirement},
	};
	use pallet_social_profiles::ProfileProvider;

	type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Currency for follow fee transfers.
		type Currency: Currency<Self::AccountId>;

		/// Fee paid to follow someone (transferred to the followed account, no refund).
		#[pallet::constant]
		type FollowFee: Get<BalanceOf<Self>>;

		/// Profile existence checker — provided by pallet-social-profiles.
		type ProfileProvider: ProfileProvider<Self::AccountId>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Follow relationship: (follower, followed) -> FollowInfo.
	/// If the key exists, the follow is active.
	#[pallet::storage]
	pub type Follows<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		Blake2_128Concat,
		T::AccountId,
		FollowInfo<T>,
	>;

	/// Follower count per account (how many people follow this account).
	#[pallet::storage]
	pub type FollowerCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	/// Following count per account (how many people this account follows).
	#[pallet::storage]
	pub type FollowingCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A user followed another user.
		Followed { follower: T::AccountId, followed: T::AccountId },
		/// A user unfollowed another user.
		Unfollowed { follower: T::AccountId, followed: T::AccountId },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// One or both accounts do not have a profile.
		ProfileNotFound,
		/// A user cannot follow themselves.
		CannotFollowSelf,
		/// The follow relationship already exists.
		AlreadyFollowing,
		/// The follow relationship does not exist.
		NotFollowing,
		/// The follower does not have enough balance to pay the follow fee.
		InsufficientBalance,
	}

	impl<T: Config> GraphProvider<T::AccountId> for Pallet<T> {
		fn is_following(follower: &T::AccountId, followed: &T::AccountId) -> bool {
			Follows::<T>::contains_key(follower, followed)
		}

		fn follower_count(account: &T::AccountId) -> u32 {
			FollowerCount::<T>::get(account)
		}

		fn following_count(account: &T::AccountId) -> u32 {
			FollowingCount::<T>::get(account)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Follow another user.
		///
		/// Both accounts must have profiles. Transfers `T::FollowFee` from the
		/// caller to the target. The fee is non-refundable. Storage writes happen
		/// before the transfer to ensure atomicity.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::follow())]
		pub fn follow(origin: OriginFor<T>, target: T::AccountId) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// 1. All validation first — no side effects.
			ensure!(who != target, Error::<T>::CannotFollowSelf);
			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);
			ensure!(T::ProfileProvider::exists(&target), Error::<T>::ProfileNotFound);
			ensure!(!Follows::<T>::contains_key(&who, &target), Error::<T>::AlreadyFollowing);

			// 2. Storage writes (infallible inserts/mutates).
			let block_number = frame_system::Pallet::<T>::block_number();
			Follows::<T>::insert(&who, &target, FollowInfo { created_at: block_number });
			FollowerCount::<T>::mutate(&target, |c| *c = c.saturating_add(1));
			FollowingCount::<T>::mutate(&who, |c| *c = c.saturating_add(1));

			// 3. Fee transfer last — if this fails, the storage overlay is rolled back by the FRAME
			//    transactional layer (dispatch returns Err).
			T::Currency::transfer(
				&who,
				&target,
				T::FollowFee::get(),
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientBalance)?;

			Self::deposit_event(Event::Followed { follower: who, followed: target });
			Ok(())
		}

		/// Unfollow a user.
		///
		/// Removes the follow relationship. No refund of the follow fee.
		/// Does not require profiles to exist — allows cleanup after profile
		/// deletion.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::unfollow())]
		pub fn unfollow(origin: OriginFor<T>, target: T::AccountId) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(Follows::<T>::contains_key(&who, &target), Error::<T>::NotFollowing);

			Follows::<T>::remove(&who, &target);

			FollowerCount::<T>::mutate(&target, |c| *c = c.saturating_sub(1));
			FollowingCount::<T>::mutate(&who, |c| *c = c.saturating_sub(1));

			Self::deposit_event(Event::Unfollowed { follower: who, followed: target });
			Ok(())
		}
	}
}

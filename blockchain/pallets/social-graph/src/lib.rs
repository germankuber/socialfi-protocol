//! # Social Graph Pallet
//!
//! Global social graph for the SocialFi protocol — follow/unfollow relationships
//! shared across all registered apps. The follow fee is set per-profile by the
//! target user (via pallet-social-profiles). If their fee is 0, follows are free.

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

		/// Profile provider — checks existence and provides per-profile follow fee.
		type ProfileProvider: ProfileProvider<Self::AccountId, BalanceOf<Self>>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Follow relationship: (follower, followed) -> FollowInfo.
	#[pallet::storage]
	pub type Follows<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		Blake2_128Concat,
		T::AccountId,
		FollowInfo<T>,
	>;

	/// Follower count per account.
	#[pallet::storage]
	pub type FollowerCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	/// Following count per account.
	#[pallet::storage]
	pub type FollowingCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A user followed another user.
		Followed {
			follower: T::AccountId,
			followed: T::AccountId,
			fee_paid: BalanceOf<T>,
		},
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
		/// Both accounts must have profiles. The follow fee is determined by the
		/// target's profile (set via `set_follow_fee` in pallet-social-profiles).
		/// If the fee is 0, the follow is free.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::follow())]
		pub fn follow(origin: OriginFor<T>, target: T::AccountId) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(who != target, Error::<T>::CannotFollowSelf);
			ensure!(T::ProfileProvider::exists(&who), Error::<T>::ProfileNotFound);
			ensure!(T::ProfileProvider::exists(&target), Error::<T>::ProfileNotFound);
			ensure!(!Follows::<T>::contains_key(&who, &target), Error::<T>::AlreadyFollowing);

			// Storage writes first (atomicity).
			let block_number = frame_system::Pallet::<T>::block_number();
			Follows::<T>::insert(&who, &target, FollowInfo { created_at: block_number });
			FollowerCount::<T>::mutate(&target, |c| *c = c.saturating_add(1));
			FollowingCount::<T>::mutate(&who, |c| *c = c.saturating_add(1));

			// Transfer per-profile follow fee to target (if > 0).
			let fee = T::ProfileProvider::follow_fee(&target);
			if fee > Zero::zero() {
				T::Currency::transfer(&who, &target, fee, ExistenceRequirement::KeepAlive)
					.map_err(|_| Error::<T>::InsufficientBalance)?;
			}

			Self::deposit_event(Event::Followed { follower: who, followed: target, fee_paid: fee });
			Ok(())
		}

		/// Unfollow a user. No refund.
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

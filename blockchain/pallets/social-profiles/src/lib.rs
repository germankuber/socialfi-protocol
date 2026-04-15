//! # Social Profiles Pallet
//!
//! Global profile registry for the SocialFi protocol. One profile per AccountId,
//! shared across all registered apps.

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

/// Trait that other pallets use to verify a user has a profile and query follow fee.
pub trait ProfileProvider<AccountId, Balance> {
	fn exists(account: &AccountId) -> bool;
	fn follow_fee(account: &AccountId) -> Balance;
}

#[frame::pallet]
pub mod pallet {
	use crate::{types::ProfileInfo, weights::WeightInfo, ProfileProvider};
	use frame::{
		prelude::*,
		traits::{Currency, ReservableCurrency},
	};

	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Currency for bond management.
		type Currency: ReservableCurrency<Self::AccountId>;

		/// Bond amount required to create a profile.
		#[pallet::constant]
		type ProfileBond: Get<BalanceOf<Self>>;

		/// Maximum length of the metadata CID (bytes).
		#[pallet::constant]
		type MaxMetadataLen: Get<u32>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Total number of profiles (for stats).
	#[pallet::storage]
	pub type ProfileCount<T: Config> = StorageValue<_, u32, ValueQuery>;

	/// Main registry: AccountId -> ProfileInfo.
	#[pallet::storage]
	pub type Profiles<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, ProfileInfo<T>>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new profile was created.
		ProfileCreated { account: T::AccountId },
		/// Profile metadata was updated.
		ProfileUpdated { account: T::AccountId },
		/// Profile follow fee was updated.
		FollowFeeUpdated { account: T::AccountId, fee: BalanceOf<T> },
		/// A profile was deleted and bond returned.
		ProfileDeleted { account: T::AccountId },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// A profile already exists for this account.
		ProfileAlreadyExists,
		/// No profile found for this account.
		ProfileNotFound,
		/// The caller does not have enough balance to cover the profile bond.
		InsufficientBond,
		/// The provided metadata exceeds the maximum allowed length.
		MetadataTooLong,
	}

	impl<T: Config> ProfileProvider<T::AccountId, BalanceOf<T>> for Pallet<T> {
		fn exists(account: &T::AccountId) -> bool {
			Profiles::<T>::contains_key(account)
		}

		fn follow_fee(account: &T::AccountId) -> BalanceOf<T> {
			Profiles::<T>::get(account)
				.map(|p| p.follow_fee)
				.unwrap_or_else(Zero::zero)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Create a new profile for the caller.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::create_profile())]
		pub fn create_profile(
			origin: OriginFor<T>,
			metadata: BoundedVec<u8, T::MaxMetadataLen>,
			follow_fee: BalanceOf<T>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(!Profiles::<T>::contains_key(&who), Error::<T>::ProfileAlreadyExists);

			T::Currency::reserve(&who, T::ProfileBond::get())
				.map_err(|_| Error::<T>::InsufficientBond)?;

			let block_number = frame_system::Pallet::<T>::block_number();
			Profiles::<T>::insert(
				&who,
				ProfileInfo { metadata, follow_fee, created_at: block_number },
			);

			ProfileCount::<T>::mutate(|count| *count = count.saturating_add(1));

			Self::deposit_event(Event::ProfileCreated { account: who });
			Ok(())
		}

		/// Update the metadata CID of an existing profile.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::update_metadata())]
		pub fn update_metadata(
			origin: OriginFor<T>,
			new_metadata: BoundedVec<u8, T::MaxMetadataLen>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			Profiles::<T>::try_mutate(&who, |maybe_profile| -> DispatchResult {
				let profile = maybe_profile.as_mut().ok_or(Error::<T>::ProfileNotFound)?;
				profile.metadata = new_metadata;
				Ok(())
			})?;

			Self::deposit_event(Event::ProfileUpdated { account: who });
			Ok(())
		}

		/// Set the follow fee for the caller's profile.
		/// Anyone who wants to follow this account must pay this fee.
		/// Set to 0 for free follows.
		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::update_metadata())]
		pub fn set_follow_fee(
			origin: OriginFor<T>,
			fee: BalanceOf<T>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			Profiles::<T>::try_mutate(&who, |maybe_profile| -> DispatchResult {
				let profile = maybe_profile.as_mut().ok_or(Error::<T>::ProfileNotFound)?;
				profile.follow_fee = fee;
				Ok(())
			})?;

			Self::deposit_event(Event::FollowFeeUpdated { account: who.clone(), fee });
			Ok(())
		}

		/// Delete the caller's profile.
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::delete_profile())]
		pub fn delete_profile(origin: OriginFor<T>) -> DispatchResult {
			let who = ensure_signed(origin)?;

			ensure!(Profiles::<T>::contains_key(&who), Error::<T>::ProfileNotFound);

			Profiles::<T>::remove(&who);
			T::Currency::unreserve(&who, T::ProfileBond::get());
			ProfileCount::<T>::mutate(|count| *count = count.saturating_sub(1));

			Self::deposit_event(Event::ProfileDeleted { account: who });
			Ok(())
		}
	}
}

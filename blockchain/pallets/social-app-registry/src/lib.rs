//! # Social App Registry Pallet
//!
//! Permissionless registry for SocialFi apps on a shared-primitives parachain.
//!
//! Apps are registered identities that consume shared social primitives (feeds,
//! graph, profiles). Registration requires a configurable token bond as anti-spam.
//! Once registered, an app's config is immutable — the only mutable field is
//! `status` (active/inactive). Deregistration sets the app to inactive and
//! unreserves the bond.

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

/// Trait that other pallets use to query app information.
pub trait AppProvider<AccountId, AppId> {
	fn get_owner(app_id: &AppId) -> Option<AccountId>;
	fn exists(app_id: &AppId) -> bool;
}

#[frame::pallet]
pub mod pallet {
	use crate::{
		types::{AppInfo, AppStatus},
		weights::WeightInfo,
	};
	use frame::{
		prelude::*,
		traits::{Currency, ReservableCurrency},
	};

	type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// The app ID type — auto-incrementing identifier for registered apps.
		type AppId: Member
			+ Parameter
			+ MaxEncodedLen
			+ Copy
			+ Default
			+ frame::traits::One
			+ frame::traits::CheckedAdd
			+ core::ops::AddAssign
			+ PartialOrd
			+ From<u32>;

		/// Currency used for bond management.
		type Currency: ReservableCurrency<Self::AccountId>;

		/// Bond amount required to register an app.
		#[pallet::constant]
		type AppBond: Get<BalanceOf<Self>>;

		/// Maximum length of the metadata CID (bytes).
		#[pallet::constant]
		type MaxMetadataLen: Get<u32>;

		/// Maximum number of apps a single account can own.
		#[pallet::constant]
		type MaxAppsPerOwner: Get<u32>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	/// Auto-incrementing app ID counter.
	#[pallet::storage]
	pub type NextAppId<T: Config> = StorageValue<_, T::AppId, ValueQuery>;

	/// Main registry: AppId -> AppInfo.
	#[pallet::storage]
	pub type Apps<T: Config> = StorageMap<_, Blake2_128Concat, T::AppId, AppInfo<T>>;

	/// Reverse lookup: AccountId -> Vec<AppId> (apps owned by this account).
	#[pallet::storage]
	pub type AppsByOwner<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		BoundedVec<T::AppId, T::MaxAppsPerOwner>,
		ValueQuery,
	>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new app was registered.
		AppRegistered { app_id: T::AppId, owner: T::AccountId },
		/// An app was deregistered (set to inactive, bond returned).
		AppDeregistered { app_id: T::AppId, owner: T::AccountId },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The caller does not have enough balance to cover the registration bond.
		InsufficientBond,
		/// No app exists with the given ID.
		AppNotFound,
		/// The caller is not the owner of this app.
		NotAppOwner,
		/// The app is already inactive.
		AppAlreadyInactive,
		/// The owner has reached the maximum number of registered apps.
		TooManyApps,
		/// The provided metadata exceeds the maximum allowed length.
		MetadataTooLong,
		/// The app ID counter has overflowed — no more apps can be registered.
		AppIdOverflow,
	}

	impl<T: Config> crate::AppProvider<T::AccountId, T::AppId> for Pallet<T> {
		fn get_owner(app_id: &T::AppId) -> Option<T::AccountId> {
			Apps::<T>::get(app_id)
				.filter(|app| app.status == AppStatus::Active)
				.map(|app| app.owner)
		}

		fn exists(app_id: &T::AppId) -> bool {
			Apps::<T>::get(app_id).is_some_and(|app| app.status == AppStatus::Active)
		}
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Register a new social app.
		///
		/// Validates capacity and balance before making any state changes.
		/// Reserves `T::AppBond`, assigns the next available AppId, stores the
		/// app record, and updates the owner's app list.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::register_app())]
		pub fn register_app(
			origin: OriginFor<T>,
			metadata: BoundedVec<u8, T::MaxMetadataLen>,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// 1. All validation first — no side effects.
			let app_id = NextAppId::<T>::get();
			let next_id = app_id.checked_add(&T::AppId::one()).ok_or(Error::<T>::AppIdOverflow)?;

			// Check owner capacity before reserving.
			let mut owner_apps = AppsByOwner::<T>::get(&who);
			owner_apps.try_push(app_id).map_err(|_| Error::<T>::TooManyApps)?;

			// 2. Side effects — all infallible from here (except reserve which we check before
			//    committing any storage writes).
			T::Currency::reserve(&who, T::AppBond::get())
				.map_err(|_| Error::<T>::InsufficientBond)?;

			let block_number = frame_system::Pallet::<T>::block_number();
			let app = AppInfo {
				owner: who.clone(),
				metadata,
				created_at: block_number,
				status: AppStatus::Active,
			};

			NextAppId::<T>::put(next_id);
			Apps::<T>::insert(app_id, app);
			AppsByOwner::<T>::insert(&who, owner_apps);

			Self::deposit_event(Event::AppRegistered { app_id, owner: who });
			Ok(())
		}

		/// Deregister an existing app.
		///
		/// Sets the app status to `Inactive`, unreserves the bond, and removes
		/// the app from the owner's index. The app record is kept for history.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::deregister_app())]
		pub fn deregister_app(origin: OriginFor<T>, app_id: T::AppId) -> DispatchResult {
			let who = ensure_signed(origin)?;

			Apps::<T>::try_mutate(app_id, |maybe_app| -> DispatchResult {
				let app = maybe_app.as_mut().ok_or(Error::<T>::AppNotFound)?;
				ensure!(app.owner == who, Error::<T>::NotAppOwner);
				ensure!(app.status != AppStatus::Inactive, Error::<T>::AppAlreadyInactive);

				app.status = AppStatus::Inactive;
				T::Currency::unreserve(&who, T::AppBond::get());

				Ok(())
			})?;

			// Remove from owner index so the slot is freed.
			AppsByOwner::<T>::mutate(&who, |apps| {
				apps.retain(|id| *id != app_id);
			});

			Self::deposit_event(Event::AppDeregistered { app_id, owner: who });
			Ok(())
		}
	}
}

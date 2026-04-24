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
///
/// All methods treat `Inactive` apps as if they did not exist — downstream
/// pallets should not be able to post, moderate, or otherwise transact
/// against an app whose owner has deregistered it. Callers that need to
/// inspect historical (inactive) records must read `Apps` storage directly.
pub trait AppProvider<AccountId, AppId> {
	/// Return the owner of an **active** app, or `None` if the app does
	/// not exist or is inactive.
	fn get_owner(app_id: &AppId) -> Option<AccountId>;
	/// `true` iff the app exists **and** is active.
	fn exists(app_id: &AppId) -> bool;
	/// `true` iff the app is active **and** was registered with
	/// `has_images = true`. Returns `false` for inactive or missing apps.
	fn has_images(app_id: &AppId) -> bool;
}

#[frame::pallet]
pub mod pallet {
	use crate::{
		types::{AppInfo, AppStatus},
		weights::WeightInfo,
	};
	use codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
	use frame::{
		deps::sp_runtime::traits::Dispatchable,
		prelude::*,
		traits::{Currency, ReservableCurrency},
	};
	use scale_info::prelude::boxed::Box;
	use scale_info::TypeInfo;
	use social_notifications_primitives::StatementSubmitter;

	type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// Custom origin emitted by this pallet when an app owner acts in a
	/// moderation capacity through [`Pallet::act_as_moderator`]. Other
	/// pallets can restrict moderation-only extrinsics with the
	/// [`EnsureAppModerator`] guard.
	///
	/// Carrying `app_id` in the origin is load-bearing: downstream code
	/// (e.g. `pallet-social-feeds::redact_post`) cross-checks that the
	/// post being moderated actually belongs to the app the moderator is
	/// authorized over. Without the `app_id` in the origin, moderators of
	/// one app could tamper with posts in another.
	#[pallet::origin]
	#[derive(
		Clone,
		Eq,
		PartialEq,
		RuntimeDebug,
		Encode,
		Decode,
		DecodeWithMemTracking,
		TypeInfo,
		MaxEncodedLen,
	)]
	#[scale_info(skip_type_params(T))]
	pub enum Origin<T: Config> {
		AppModerator { app_id: T::AppId, moderator: T::AccountId },
	}

	/// Guard that lifts the [`Origin::AppModerator`] variant into
	/// `(app_id, moderator)`. Intended to be composed with `EnsureSigned`
	/// via `EitherOfDiverse` by pallets that accept either a
	/// directly-signed call or a moderation dispatch.
	pub struct EnsureAppModerator<T>(core::marker::PhantomData<T>);

	impl<T: Config> EnsureOrigin<<T as frame_system::Config>::RuntimeOrigin> for EnsureAppModerator<T>
	where
		<T as frame_system::Config>::RuntimeOrigin:
			From<Origin<T>> + Into<Result<Origin<T>, <T as frame_system::Config>::RuntimeOrigin>>,
	{
		type Success = (T::AppId, T::AccountId);

		fn try_origin(
			o: <T as frame_system::Config>::RuntimeOrigin,
		) -> Result<Self::Success, <T as frame_system::Config>::RuntimeOrigin> {
			o.into().map(|Origin::AppModerator { app_id, moderator }| (app_id, moderator))
		}

		/// Produce a usable `Origin::AppModerator` for benchmarking.
		///
		/// Mirrors `pallet_collective::EnsureMember::try_successful_origin`
		/// (`substrate/frame/collective/src/lib.rs:1400-1406`):
		/// decode a zero-filled `AccountId` — the bytes are meaningless
		/// but the type is well-formed — and pair it with a default
		/// `AppId`. Benchmarks run against this synthetic origin; there
		/// is no real storage interaction, only dispatching through
		/// `ModerationOrigin` in downstream pallets.
		#[cfg(feature = "runtime-benchmarks")]
		fn try_successful_origin() -> Result<<T as frame_system::Config>::RuntimeOrigin, ()> {
			let moderator = T::AccountId::decode(
				&mut frame::deps::sp_runtime::traits::TrailingZeroInput::zeroes(),
			)
			.map_err(|_| ())?;
			let app_id = T::AppId::default();
			Ok(Origin::AppModerator { app_id, moderator }.into())
		}
	}

	#[pallet::config]
	pub trait Config:
		frame_system::Config<
		RuntimeCall: Parameter
		                 + Dispatchable<
			RuntimeOrigin = <Self as frame_system::Config>::RuntimeOrigin,
			PostInfo = frame::deps::frame_support::dispatch::PostDispatchInfo,
		> + GetDispatchInfo,
		RuntimeOrigin: From<Origin<Self>>,
	>
	{
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

		/// Submitter for real-time Statement Store notifications. The
		/// runtime wires this to `pallet-statement`; mocks default to
		/// `()` which discards every submission.
		type NotificationSubmitter: social_notifications_primitives::StatementSubmitter<
			Self::AccountId,
		>;
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
		/// An app owner attempted to dispatch a call as
		/// `Origin::AppModerator`. Emitted before the inner call runs, so
		/// the inner call may still fail — this event records the
		/// *moderation attempt* for audit tooling, not a confirmed effect.
		/// Pair with the downstream call's own event to distinguish
		/// attempted from applied moderation.
		ModeratorDispatched { app_id: T::AppId, moderator: T::AccountId },
		/// Emitted on the registration that fills the owner's last
		/// available slot. Signals to indexers / front-ends that any
		/// further `register_app` from this account will fail with
		/// `TooManyApps` until a deregister frees a slot.
		OwnerAppLimitReached { owner: T::AccountId, cap: u32 },
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

		fn has_images(app_id: &T::AppId) -> bool {
			Apps::<T>::get(app_id)
				.is_some_and(|app| app.status == AppStatus::Active && app.has_images)
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
		#[pallet::weight(T::WeightInfo::register_app(metadata.len() as u32))]
		pub fn register_app(
			origin: OriginFor<T>,
			metadata: BoundedVec<u8, T::MaxMetadataLen>,
			has_images: bool,
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
				has_images,
				created_at: block_number,
				status: AppStatus::Active,
			};

			NextAppId::<T>::put(next_id);
			Apps::<T>::insert(app_id, app);
			let slots_used = owner_apps.len() as u32;
			AppsByOwner::<T>::insert(&who, owner_apps);

			log::info!(
				target: "social-app-registry",
				"🏗️ register_app owner={:?} app_id={:?} has_images={} slots={}",
				who, app_id, has_images, slots_used,
			);

			Self::deposit_event(Event::AppRegistered { app_id, owner: who.clone() });

			// Broadcast a Statement Store notification so any client
			// subscribed to `BROADCAST_NEW_APP_TOPIC` learns about the
			// new app in real time — no block polling required.
			let notif = social_notifications_primitives::build_statement(
				who.clone(),
				&social_notifications_primitives::Recipient::Broadcast,
				social_notifications_primitives::NotificationKind::NewApp,
				&app_id,
				frame::deps::sp_runtime::traits::SaturatedConversion::saturated_into::<u64>(
					block_number,
				),
			);
			T::NotificationSubmitter::submit_statement(who.clone(), notif);

			// Owner just filled the last slot — surface it for UX/indexers.
			// Next register_app from the same account will fail with
			// `TooManyApps` until a deregister reopens a slot.
			let cap = T::MaxAppsPerOwner::get();
			if slots_used == cap {
				Self::deposit_event(Event::OwnerAppLimitReached { owner: who, cap });
			}
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

			// 1. `try_mutate` only touches `Apps`. Keep the closure pure over
			//    that storage item — no currency / cross-pallet calls inside,
			//    so the closure stays trivially refundable and free of lock
			//    coupling.
			Apps::<T>::try_mutate(app_id, |maybe_app| -> DispatchResult {
				let app = maybe_app.as_mut().ok_or(Error::<T>::AppNotFound)?;
				ensure!(app.owner == who, Error::<T>::NotAppOwner);
				ensure!(app.status != AppStatus::Inactive, Error::<T>::AppAlreadyInactive);
				app.status = AppStatus::Inactive;
				Ok(())
			})?;

			// 2. Cross-pallet effects run AFTER `Apps` is committed, each
			//    owning its own storage slot:
			//    a) unreserve the bond from pallet-balances,
			//    b) drop the app id from the owner's index.
			//
			//    `unreserve` returns the amount it could not release. With
			//    our bookkeeping invariant (`AppBond` was reserved in
			//    `register_app`) this is always zero — a non-zero value
			//    signals state corruption and is worth logging.
			let not_unreserved = T::Currency::unreserve(&who, T::AppBond::get());
			if !not_unreserved.is_zero() {
				log::warn!(
					target: "social-app-registry",
					"⚠️ deregister_app could not unreserve full bond for {:?}: {:?} remaining",
					who, not_unreserved,
				);
			}

			AppsByOwner::<T>::mutate(&who, |apps| apps.retain(|id| *id != app_id));

			log::info!(
				target: "social-app-registry",
				"💤 deregister_app owner={:?} app_id={:?}",
				who, app_id,
			);

			Self::deposit_event(Event::AppDeregistered { app_id, owner: who });
			Ok(())
		}

		/// Dispatch `call` under an [`Origin::AppModerator`] so that
		/// downstream pallets can gate moderation-only extrinsics on the
		/// `EnsureAppModerator` guard.
		///
		/// The caller must be the registered owner of `app_id`. The
		/// inner call's weight is added to the base weight so the fee
		/// reflects the full amount of work.
		#[pallet::call_index(2)]
		#[pallet::weight({
			let di = call.get_dispatch_info();
			(
				T::WeightInfo::deregister_app().saturating_add(di.call_weight),
				di.class,
			)
		})]
		pub fn act_as_moderator(
			origin: OriginFor<T>,
			app_id: T::AppId,
			call: Box<<T as frame_system::Config>::RuntimeCall>,
		) -> DispatchResultWithPostInfo {
			let who = ensure_signed(origin)?;

			let app = Apps::<T>::get(app_id).ok_or(Error::<T>::AppNotFound)?;
			ensure!(app.owner == who, Error::<T>::NotAppOwner);
			ensure!(app.status == AppStatus::Active, Error::<T>::AppAlreadyInactive);

			Self::deposit_event(Event::ModeratorDispatched { app_id, moderator: who.clone() });

			let mod_origin: <T as frame_system::Config>::RuntimeOrigin =
				Origin::AppModerator { app_id, moderator: who }.into();

			let inner_di = call.get_dispatch_info();
			let result = call.dispatch(mod_origin);

			let actual_weight = match &result {
				Ok(post) => post.actual_weight.unwrap_or(inner_di.call_weight),
				Err(e) => e.post_info.actual_weight.unwrap_or(inner_di.call_weight),
			};

			Ok(PostDispatchInfo {
				actual_weight: Some(T::WeightInfo::deregister_app().saturating_add(actual_weight)),
				pays_fee: Pays::Yes,
			})
		}
	}
}

//! # Social Managers Pallet
//!
//! Scoped delegation of social actions, inspired by Lens Protocol's Profile
//! Manager. A profile owner authorizes another account (the *manager*) to
//! perform specific actions on their behalf — posting, commenting, following —
//! without giving up custody of their keys or their funds.
//!
//! ## Why a new pallet instead of `pallet-proxy`?
//!
//! `pallet-proxy` delegates *any* `RuntimeCall` by matching on the call's
//! `(pallet_index, call_index)` via an `InstanceFilter`. That is powerful but
//! has three limitations for a social protocol:
//!
//! 1. **No per-profile scoping.** `pallet-proxy` keys authorizations by `AccountId` only, so
//!    `InstanceFilter::Posting` would let a manager post for *any* owner who added them, not only
//!    for a specific profile.
//! 2. **No native expiration.** Proxy authorizations are revoked explicitly or not at all.
//! 3. **No atomic revoke-all for social managers.** `remove_proxies` nukes every proxy the owner
//!    holds — including staking/governance proxies — which is a foot-gun at panic time.
//!
//! This pallet reuses the core *technique* pioneered by `pallet-proxy`:
//! synthesize `RawOrigin::Signed(owner)` inside `act_as_manager` and install a
//! dynamic call filter that enforces the manager's scopes. Because the
//! resulting origin is a plain `Signed`, existing social pallets (feeds,
//! graph, profiles) require zero modifications — their `ensure_signed(origin)`
//! keeps working and simply sees the owner as the caller.
//!
//! See `substrate/frame/proxy/src/lib.rs:994-1026` for the canonical pattern.
//!
//! ## Anti-escalation rules
//!
//! `act_as_manager` installs a call filter that blocks:
//! - recursion into `act_as_manager` itself,
//! - any `add_manager` / `remove_manager` / `remove_all_managers` call (a manager must not be able
//!   to alter their own authorization),
//! - any call to this pallet that would let a manager change their own scopes.
//!
//! The inner call is dispatched via plain `call.dispatch(origin)`, which
//! respects `BaseCallFilter`. We intentionally do not use
//! `dispatch_bypass_filter` (that is reserved for root).

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod types;
pub mod weights;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame::pallet]
pub mod pallet {
	use crate::{
		types::{ManagerInfo, ManagerScope, ScopeMask},
		weights::WeightInfo,
	};
	use frame::{
		prelude::*,
		traits::{Currency, Dispatchable, GetCallMetadata, OriginTrait, ReservableCurrency},
	};
	use scale_info::prelude::boxed::Box;

	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// Pallet configuration.
	///
	/// The `RuntimeEvent` bound is attached directly to `frame_system::Config`
	/// rather than declared as an associated type here — the newer
	/// recommended style (see polkadot-sdk PR #7229).
	#[pallet::config]
	pub trait Config:
		frame_system::Config<
		RuntimeEvent: From<Event<Self>>,
		RuntimeCall: Parameter
		                 + Dispatchable<
			RuntimeOrigin = <Self as frame_system::Config>::RuntimeOrigin,
			PostInfo = frame::deps::frame_support::dispatch::PostDispatchInfo,
		> + GetDispatchInfo
		                 + GetCallMetadata,
	>
	{
		/// Currency used to reserve per-manager deposits.
		type Currency: ReservableCurrency<Self::AccountId>;

		/// Flat deposit reserved on the owner for each active manager entry.
		///
		/// Deposits stop a bad actor from bloating state by adding thousands
		/// of managers for free. Set to zero in dev runtimes.
		#[pallet::constant]
		type ManagerDepositBase: Get<BalanceOf<Self>>;

		/// Maximum number of simultaneously-active managers per owner. Bounds
		/// the worst-case iteration cost of `remove_all_managers` and
		/// `on_idle` expiry purges.
		#[pallet::constant]
		type MaxManagersPerOwner: Get<u32>;

		/// Maximum number of expired entries the `on_idle` hook may purge per
		/// block. Keeps idle-reclaim bounded so it never starves other
		/// opportunistic work.
		#[pallet::constant]
		type MaxExpiryPurgePerBlock: Get<u32>;

		type WeightInfo: WeightInfo;
	}

	/// Active manager authorizations, keyed by `(owner, manager)`.
	///
	/// We key by raw `AccountId` on both axes because this pallet piggy-backs
	/// on `pallet-social-profiles`' one-profile-per-account invariant: the
	/// owner's `AccountId` *is* their profile id.
	#[pallet::storage]
	pub type ProfileManagers<T: Config> = StorageDoubleMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		Blake2_128Concat,
		T::AccountId,
		ManagerInfo<T>,
		OptionQuery,
	>;

	/// Number of active manager entries for each owner. Maintained alongside
	/// [`ProfileManagers`] so we can enforce [`Config::MaxManagersPerOwner`]
	/// without iterating the prefix on every insert.
	#[pallet::storage]
	pub type ManagerCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A new manager authorization was granted.
		ManagerAdded {
			owner: T::AccountId,
			manager: T::AccountId,
			scopes: ScopeMask,
			expires_at: Option<BlockNumberFor<T>>,
			deposit: BalanceOf<T>,
		},
		/// An authorization was explicitly revoked by the owner.
		ManagerRemoved {
			owner: T::AccountId,
			manager: T::AccountId,
			deposit_released: BalanceOf<T>,
		},
		/// The owner wiped every manager authorization in a single call.
		AllManagersRemoved {
			owner: T::AccountId,
			removed_count: u32,
			deposit_released: BalanceOf<T>,
		},
		/// A manager successfully dispatched an inner call on the owner's
		/// behalf. `result` reports whether the inner call succeeded.
		ActedAsManager { owner: T::AccountId, manager: T::AccountId, result: DispatchResult },
		/// The `on_idle` hook lazily purged an expired authorization and
		/// returned the deposit to the owner.
		ExpiredManagerPurged {
			owner: T::AccountId,
			manager: T::AccountId,
			deposit_released: BalanceOf<T>,
		},
	}

	#[pallet::error]
	pub enum Error<T> {
		/// There is no manager record for this `(owner, manager)` pair.
		ManagerNotFound,
		/// A manager with that account already exists for this owner.
		ManagerAlreadyExists,
		/// The owner already has [`Config::MaxManagersPerOwner`] active
		/// managers and cannot add more.
		TooManyManagers,
		/// The authorization has expired and must be renewed by the owner.
		ManagerExpired,
		/// The caller tried to act under a scope they were not granted.
		ScopeNotAuthorized,
		/// The inner call targets an extrinsic that this pallet refuses to
		/// delegate (e.g. self-management, utility::dispatch_as, balance
		/// transfers).
		CallNotDelegatable,
		/// Requested scope set is empty (no bits set). Prevents accidentally
		/// creating useless entries.
		EmptyScopeSet,
		/// Expiration block number must be strictly greater than the current
		/// block.
		ExpirationInPast,
		/// The owner does not have enough free balance to reserve the
		/// per-manager deposit.
		InsufficientDeposit,
		/// An owner tried to authorize themselves as a manager. There is no
		/// semantic value to self-delegation and allowing it would burn a
		/// `MaxManagersPerOwner` slot for nothing.
		ManagerCannotBeSelf,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Authorize `manager` to act on the caller's behalf under `scopes`.
		///
		/// The caller is the profile owner. A flat deposit of
		/// [`Config::ManagerDepositBase`] is reserved on the owner and
		/// returned when the manager is removed. An optional `expires_at`
		/// block number bounds the authorization in time.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::add_manager())]
		pub fn add_manager(
			origin: OriginFor<T>,
			manager: T::AccountId,
			scopes: ScopeMask,
			expires_at: Option<BlockNumberFor<T>>,
		) -> DispatchResult {
			let owner = ensure_signed(origin)?;

			// Self-delegation is nonsensical: an owner can already perform every
			// action we'd authorize a manager for, and allowing it would let a
			// single entry consume a MaxManagersPerOwner slot for nothing.
			ensure!(owner != manager, Error::<T>::ManagerCannotBeSelf);
			ensure!(!scopes.is_empty(), Error::<T>::EmptyScopeSet);
			ensure!(
				!ProfileManagers::<T>::contains_key(&owner, &manager),
				Error::<T>::ManagerAlreadyExists,
			);

			let now = frame_system::Pallet::<T>::block_number();
			if let Some(exp) = expires_at {
				ensure!(exp > now, Error::<T>::ExpirationInPast);
			}

			let count = ManagerCount::<T>::get(&owner);
			ensure!(count < T::MaxManagersPerOwner::get(), Error::<T>::TooManyManagers);

			let deposit = T::ManagerDepositBase::get();
			T::Currency::reserve(&owner, deposit).map_err(|_| Error::<T>::InsufficientDeposit)?;

			ProfileManagers::<T>::insert(
				&owner,
				&manager,
				ManagerInfo { scopes, expires_at, deposit },
			);
			ManagerCount::<T>::insert(&owner, count.saturating_add(1));

			Self::deposit_event(Event::ManagerAdded {
				owner,
				manager,
				scopes,
				expires_at,
				deposit,
			});
			Ok(())
		}

		/// Revoke a single manager. The reserved deposit is released back to
		/// the owner in the same block.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::remove_manager())]
		pub fn remove_manager(origin: OriginFor<T>, manager: T::AccountId) -> DispatchResult {
			let owner = ensure_signed(origin)?;

			let info =
				ProfileManagers::<T>::take(&owner, &manager).ok_or(Error::<T>::ManagerNotFound)?;

			T::Currency::unreserve(&owner, info.deposit);
			ManagerCount::<T>::mutate(&owner, |c| *c = c.saturating_sub(1));

			Self::deposit_event(Event::ManagerRemoved {
				owner,
				manager,
				deposit_released: info.deposit,
			});
			Ok(())
		}

		/// Emergency sweep: wipe every active manager for the caller and
		/// release all deposits at once. This is the "lost my keys, someone
		/// grab the account" panic button.
		///
		/// Bounded by [`Config::MaxManagersPerOwner`], so the worst-case
		/// weight is deterministic.
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::remove_all_managers(T::MaxManagersPerOwner::get()))]
		pub fn remove_all_managers(origin: OriginFor<T>) -> DispatchResult {
			let owner = ensure_signed(origin)?;

			let mut total_released = BalanceOf::<T>::zero();
			let mut removed: u32 = 0;

			let removed_entries: scale_info::prelude::vec::Vec<(T::AccountId, BalanceOf<T>)> =
				ProfileManagers::<T>::drain_prefix(&owner)
					.map(|(manager, info)| (manager, info.deposit))
					.collect();

			for (_manager, deposit) in &removed_entries {
				T::Currency::unreserve(&owner, *deposit);
				total_released = total_released.saturating_add(*deposit);
				removed = removed.saturating_add(1);
			}

			ManagerCount::<T>::remove(&owner);

			Self::deposit_event(Event::AllManagersRemoved {
				owner,
				removed_count: removed,
				deposit_released: total_released,
			});
			Ok(())
		}

		/// Dispatch `call` as if the caller were `owner`, provided the caller
		/// is an active manager of `owner` and the call matches one of their
		/// authorized scopes.
		///
		/// This mirrors `pallet-proxy::proxy`: the inner call is dispatched
		/// with `RawOrigin::Signed(owner)` and a dynamic filter installed on
		/// the origin enforces scope plus the anti-escalation rules. Downstream
		/// pallets see a regular `Signed` origin and require no changes.
		///
		/// Weight is charged as `act_as_manager() + inner_call.call_weight`,
		/// matching the pattern used by `pallet-proxy` at
		/// `substrate/frame/proxy/src/lib.rs:240-262`.
		#[pallet::call_index(3)]
		#[pallet::weight({
			let di = call.get_dispatch_info();
			(
				T::WeightInfo::act_as_manager().saturating_add(di.call_weight),
				di.class,
			)
		})]
		pub fn act_as_manager(
			origin: OriginFor<T>,
			owner: T::AccountId,
			call: Box<<T as frame_system::Config>::RuntimeCall>,
		) -> DispatchResultWithPostInfo {
			let manager = ensure_signed(origin)?;

			let info =
				ProfileManagers::<T>::get(&owner, &manager).ok_or(Error::<T>::ManagerNotFound)?;

			if let Some(exp) = info.expires_at {
				let now = frame_system::Pallet::<T>::block_number();
				ensure!(now < exp, Error::<T>::ManagerExpired);
			}

			let scopes = info.scopes;
			let required = Self::required_scope(&call).ok_or(Error::<T>::CallNotDelegatable)?;
			ensure!(scopes.contains(required), Error::<T>::ScopeNotAuthorized);

			// Synthesize `Signed(owner)` and install the scope filter.
			// `add_filter` stacks on top of any existing filter (e.g. the
			// runtime's BaseCallFilter), so we never weaken the call surface.
			let mut synthesized: <T as frame_system::Config>::RuntimeOrigin =
				frame_system::RawOrigin::Signed(owner.clone()).into();
			synthesized.add_filter(move |inner| Self::delegation_filter(inner, scopes));

			let inner_di = call.get_dispatch_info();
			let dispatch_result = call.dispatch(synthesized);

			let actual_weight = match &dispatch_result {
				Ok(post) => post.actual_weight.unwrap_or(inner_di.call_weight),
				Err(err) => err.post_info.actual_weight.unwrap_or(inner_di.call_weight),
			};

			Self::deposit_event(Event::ActedAsManager {
				owner,
				manager,
				result: dispatch_result.map(|_| ()).map_err(|e| e.error),
			});

			Ok(PostDispatchInfo {
				actual_weight: Some(T::WeightInfo::act_as_manager().saturating_add(actual_weight)),
				pays_fee: Pays::Yes,
			})
		}
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
		/// Lazily reclaim deposits from expired authorizations.
		///
		/// We iterate at most [`Config::MaxExpiryPurgePerBlock`] entries per
		/// block and stop early if the remaining weight budget cannot cover
		/// another purge. This keeps the block-production path responsive and
		/// avoids the common pitfall of an `on_idle` hook that consumes every
		/// leftover weight unit.
		fn on_idle(now: BlockNumberFor<T>, remaining_weight: Weight) -> Weight {
			let per_purge = T::DbWeight::get().reads(1) + T::DbWeight::get().writes(2);
			let budget = T::MaxExpiryPurgePerBlock::get();

			let mut used = Weight::zero();
			let mut purged: u32 = 0;

			let expired: scale_info::prelude::vec::Vec<(T::AccountId, T::AccountId)> =
				ProfileManagers::<T>::iter()
					.filter_map(|(owner, manager, info)| {
						info.expires_at.filter(|exp| now >= *exp).map(|_| (owner, manager))
					})
					.take(budget as usize)
					.collect();

			for (owner, manager) in expired {
				if used.saturating_add(per_purge).any_gt(remaining_weight) {
					break;
				}

				if let Some(info) = ProfileManagers::<T>::take(&owner, &manager) {
					T::Currency::unreserve(&owner, info.deposit);
					ManagerCount::<T>::mutate(&owner, |c| *c = c.saturating_sub(1));

					Self::deposit_event(Event::ExpiredManagerPurged {
						owner,
						manager,
						deposit_released: info.deposit,
					});
				}

				used = used.saturating_add(per_purge);
				purged = purged.saturating_add(1);
			}

			let _ = purged;
			used
		}
	}

	impl<T: Config> Pallet<T> {
		/// Map a `RuntimeCall` to the minimum [`ManagerScope`] that authorizes
		/// it. Returns `None` for calls this pallet refuses to delegate (those
		/// will surface as `CallNotDelegatable`).
		///
		/// We deliberately identify target calls by their metadata pallet name
		/// rather than by `IsSubType`: generic mapping across an arbitrary set
		/// of runtime pallets is what lets this pallet integrate with
		/// `pallet-social-feeds`, `pallet-social-graph` and
		/// `pallet-social-profiles` without pulling them in as direct
		/// dependencies (that would create a circular graph).
		///
		/// The `SocialManagers` pallet is deliberately absent from the allow
		/// table: a manager must never be able to manipulate their own
		/// authorization record.
		pub(crate) fn required_scope(
			call: &<T as frame_system::Config>::RuntimeCall,
		) -> Option<ManagerScope> {
			let meta = call.get_call_metadata();
			match (meta.pallet_name, meta.function_name) {
				("SocialFeeds", "create_post") => Some(ManagerScope::Post),
				("SocialFeeds", "create_reply") => Some(ManagerScope::Comment),
				("SocialFeeds", "unlock_post") => Some(ManagerScope::Post),
				("SocialGraph", "follow") | ("SocialGraph", "unfollow") => {
					Some(ManagerScope::Follow)
				},
				("SocialProfiles", "update_metadata") | ("SocialProfiles", "set_follow_fee") => {
					Some(ManagerScope::UpdateProfile)
				},
				_ => None,
			}
		}

		/// Dynamic filter installed on the synthesized origin.
		///
		/// The rule is "default deny": a call is accepted only if it maps to
		/// a known social scope and that scope is present in the authorized
		/// bitmask. Any call to this pallet (including `act_as_manager`
		/// itself) is rejected because this pallet is absent from the allow
		/// table in `required_scope`, closing both the escalation and
		/// recursion holes in one step.
		///
		/// Blanket-denying unknown calls also means `pallet-utility`
		/// (`batch`, `dispatch_as`), `pallet-balances::transfer_*`, and any
		/// other non-social extrinsic cannot be reached through a manager —
		/// even if they were somehow authorized upstream.
		fn delegation_filter(
			call: &<T as frame_system::Config>::RuntimeCall,
			authorized: ScopeMask,
		) -> bool {
			match Self::required_scope(call) {
				Some(scope) => authorized.contains(scope),
				None => false,
			}
		}
	}
}

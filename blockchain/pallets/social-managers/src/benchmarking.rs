//! Benchmarks for `pallet-social-managers`.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::{
	pallet::{ManagerCount, ProfileManagers},
	types::{ManagerScope, ScopeMask},
	BenchmarkHelper,
};
use frame::{
	deps::frame_benchmarking::v2::*,
	prelude::*,
	traits::{Currency, ReservableCurrency},
};
use scale_info::prelude::boxed::Box;

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialManagers;
	use frame_system::RawOrigin;

	const SEED: u32 = 0;

	fn fund<T: Config>(who: &T::AccountId) {
		let base = T::ManagerDepositBase::get();
		let cap = T::MaxManagersPerOwner::get();
		let budget = base.saturating_mul((cap as u32).saturating_add(1).into());
		T::Currency::make_free_balance_be(who, budget.saturating_mul(4u32.into()));
	}

	/// Adds `n` manager entries for `owner` — reserving the matching
	/// deposit for each — so the next write measures the full worst-case
	/// state and the `ManagerCount` cap is just short of the limit.
	fn fill_managers<T: Config>(owner: &T::AccountId, n: u32) {
		let base = T::ManagerDepositBase::get();
		for i in 0..n {
			let manager: T::AccountId = account("manager", i, SEED);
			ProfileManagers::<T>::insert(
				owner,
				&manager,
				crate::types::ManagerInfo::<T> {
					scopes: ScopeMask::from_scopes(&[ManagerScope::Post]),
					expires_at: None,
					deposit: base,
				},
			);
			T::Currency::reserve(owner, base).expect("owner funded");
			ManagerCount::<T>::mutate(owner, |c| *c = c.saturating_add(1));
		}
	}

	#[benchmark]
	fn add_manager() -> Result<(), BenchmarkError> {
		let owner: T::AccountId = whitelisted_caller();
		fund::<T>(&owner);
		// Pre-fill the owner's slots up to (cap - 1) so the last insert
		// is the one measured — worst case is adding the final manager.
		let cap = T::MaxManagersPerOwner::get();
		fill_managers::<T>(&owner, cap.saturating_sub(1));

		let manager: T::AccountId = account("new_manager", 0, SEED);

		#[extrinsic_call]
		add_manager(
			RawOrigin::Signed(owner.clone()),
			manager.clone(),
			ScopeMask::from_scopes(&[ManagerScope::Post, ManagerScope::Comment]),
			None,
		);

		assert!(ProfileManagers::<T>::contains_key(&owner, &manager));
		assert_eq!(ManagerCount::<T>::get(&owner), cap);
		Ok(())
	}

	#[benchmark]
	fn remove_manager() -> Result<(), BenchmarkError> {
		let owner: T::AccountId = whitelisted_caller();
		fund::<T>(&owner);
		// One pre-existing manager we will remove.
		fill_managers::<T>(&owner, 1);
		let manager: T::AccountId = account("manager", 0, SEED);

		#[extrinsic_call]
		remove_manager(RawOrigin::Signed(owner.clone()), manager.clone());

		assert!(!ProfileManagers::<T>::contains_key(&owner, &manager));
		Ok(())
	}

	#[benchmark]
	fn remove_all_managers(
		n: Linear<0, { <T as pallet::Config>::MaxManagersPerOwner::get() }>,
	) -> Result<(), BenchmarkError> {
		let owner: T::AccountId = whitelisted_caller();
		fund::<T>(&owner);
		fill_managers::<T>(&owner, n);

		#[extrinsic_call]
		remove_all_managers(RawOrigin::Signed(owner.clone()));

		assert_eq!(ManagerCount::<T>::get(&owner), 0);
		Ok(())
	}

	#[benchmark]
	fn act_as_manager() -> Result<(), BenchmarkError> {
		let owner: T::AccountId = whitelisted_caller();
		let manager: T::AccountId = account("manager", 0, SEED);
		fund::<T>(&owner);
		fund::<T>(&manager);

		let scopes = T::BenchmarkHelper::scope_for_scoped_call();
		let base = T::ManagerDepositBase::get();
		ProfileManagers::<T>::insert(
			&owner,
			&manager,
			crate::types::ManagerInfo::<T> { scopes, expires_at: None, deposit: base },
		);
		T::Currency::reserve(&owner, base).expect("owner funded");
		ManagerCount::<T>::mutate(&owner, |c| *c = c.saturating_add(1));

		let inner = T::BenchmarkHelper::scoped_call();

		#[extrinsic_call]
		act_as_manager(RawOrigin::Signed(manager.clone()), owner.clone(), Box::new(inner));

		Ok(())
	}

	impl_benchmark_test_suite!(SocialManagers, crate::mock::new_test_ext(), crate::mock::Test,);
}

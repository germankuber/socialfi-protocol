//! Benchmarks for `pallet-social-graph`.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::BenchmarkHelper;
use frame::{deps::frame_benchmarking::v2::*, prelude::*, traits::Currency};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialGraph;
	use frame_system::RawOrigin;

	const SEED: u32 = 0;

	fn fund<T: Config>(who: &T::AccountId) {
		// Large enough that per-profile follow fees (set by the target
		// through social-profiles) never run the caller out of funds.
		let big: BalanceOf<T> = 1_000_000_000u32.into();
		T::Currency::make_free_balance_be(who, big);
	}

	#[benchmark]
	fn follow() {
		let caller: T::AccountId = whitelisted_caller();
		let target: T::AccountId = account("target", 0, SEED);
		fund::<T>(&caller);
		fund::<T>(&target);
		T::BenchmarkHelper::register_profile(&caller);
		T::BenchmarkHelper::register_profile(&target);

		#[extrinsic_call]
		follow(RawOrigin::Signed(caller.clone()), target.clone());

		assert!(Follows::<T>::contains_key(&caller, &target));
	}

	#[benchmark]
	fn unfollow() {
		let caller: T::AccountId = whitelisted_caller();
		let target: T::AccountId = account("target", 0, SEED);
		fund::<T>(&caller);
		fund::<T>(&target);

		let block_number = frame_system::Pallet::<T>::block_number();
		Follows::<T>::insert(&caller, &target, types::FollowInfo { created_at: block_number });
		FollowerCount::<T>::insert(&target, 1u32);
		FollowingCount::<T>::insert(&caller, 1u32);

		#[extrinsic_call]
		unfollow(RawOrigin::Signed(caller.clone()), target.clone());

		assert!(!Follows::<T>::contains_key(&caller, &target));
	}

	impl_benchmark_test_suite!(SocialGraph, crate::mock::new_test_ext(), crate::mock::Test,);
}

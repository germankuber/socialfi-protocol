//! Benchmarking setup for pallet-social-graph

use super::*;
use frame::{deps::frame_benchmarking::v2::*, prelude::*};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialGraph;
	use frame_system::RawOrigin;

	#[benchmark]
	fn follow() {
		let caller: T::AccountId = whitelisted_caller();
		let target: T::AccountId = account("target", 0, 0);

		let fee = T::FollowFee::get();
		let deposit = fee.saturating_mul(10u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);
		T::Currency::make_free_balance_be(&target, deposit);

		#[extrinsic_call]
		follow(RawOrigin::Signed(caller.clone()), target.clone());

		assert!(Follows::<T>::contains_key(&caller, &target));
	}

	#[benchmark]
	fn unfollow() {
		let caller: T::AccountId = whitelisted_caller();
		let target: T::AccountId = account("target", 0, 0);

		let fee = T::FollowFee::get();
		let deposit = fee.saturating_mul(10u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);
		T::Currency::make_free_balance_be(&target, deposit);

		let block_number = frame_system::Pallet::<T>::block_number();
		Follows::<T>::insert(&caller, &target, types::FollowInfo { created_at: block_number });
		FollowerCount::<T>::insert(&target, 1u32);
		FollowingCount::<T>::insert(&caller, 1u32);

		#[extrinsic_call]
		unfollow(RawOrigin::Signed(caller.clone()), target.clone());

		assert!(!Follows::<T>::contains_key(&caller, &target));
	}

	impl_benchmark_test_suite!(SocialGraph, crate::mock::new_test_ext(), crate::mock::Test);
}

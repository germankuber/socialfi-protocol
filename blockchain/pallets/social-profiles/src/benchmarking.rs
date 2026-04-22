//! Benchmarks for `pallet-social-profiles`.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use frame::{
	deps::frame_benchmarking::v2::*,
	prelude::*,
	traits::{Currency, ReservableCurrency},
};
use scale_info::prelude::vec;

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialProfiles;
	use frame_system::RawOrigin;

	fn fund<T: Config>(who: &T::AccountId) {
		let bond = T::ProfileBond::get();
		T::Currency::make_free_balance_be(who, bond.saturating_mul(4u32.into()));
	}

	fn max_metadata<T: Config>() -> BoundedVec<u8, T::MaxMetadataLen> {
		let n = T::MaxMetadataLen::get() as usize;
		BoundedVec::try_from(vec![b'x'; n]).expect("length == bound")
	}

	fn seed_profile<T: Config>(caller: &T::AccountId) {
		let md = max_metadata::<T>();
		let block_number = frame_system::Pallet::<T>::block_number();
		Profiles::<T>::insert(
			caller,
			types::ProfileInfo { metadata: md, follow_fee: 0u32.into(), created_at: block_number },
		);
		T::Currency::reserve(caller, T::ProfileBond::get()).expect("caller funded");
		ProfileCount::<T>::mutate(|c| *c = c.saturating_add(1));
	}

	#[benchmark]
	fn create_profile() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);

		#[extrinsic_call]
		create_profile(RawOrigin::Signed(caller.clone()), max_metadata::<T>(), 0u32.into());

		assert!(Profiles::<T>::contains_key(&caller));
	}

	#[benchmark]
	fn update_metadata() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		seed_profile::<T>(&caller);
		let new_md = max_metadata::<T>();

		#[extrinsic_call]
		update_metadata(RawOrigin::Signed(caller.clone()), new_md.clone());

		let profile = Profiles::<T>::get(&caller).expect("still present");
		assert_eq!(profile.metadata, new_md);
	}

	#[benchmark]
	fn set_follow_fee() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		seed_profile::<T>(&caller);

		#[extrinsic_call]
		set_follow_fee(RawOrigin::Signed(caller.clone()), 42u32.into());

		let profile = Profiles::<T>::get(&caller).expect("still present");
		assert_eq!(profile.follow_fee, 42u32.into());
	}

	#[benchmark]
	fn delete_profile() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		seed_profile::<T>(&caller);

		#[extrinsic_call]
		delete_profile(RawOrigin::Signed(caller.clone()));

		assert!(!Profiles::<T>::contains_key(&caller));
	}

	impl_benchmark_test_suite!(
		SocialProfiles,
		crate::mock::new_test_ext(),
		crate::mock::Test,
	);
}

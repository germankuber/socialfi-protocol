//! Benchmarking setup for pallet-social-profiles

use super::*;
use frame::{deps::frame_benchmarking::v2::*, prelude::*};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialProfiles;
	use frame_system::RawOrigin;

	#[benchmark]
	fn create_profile() {
		let caller: T::AccountId = whitelisted_caller();
		let metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmProfileCid123".to_vec()).unwrap();

		let bond = T::ProfileBond::get();
		let deposit = bond.saturating_mul(2u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);

		#[extrinsic_call]
		create_profile(RawOrigin::Signed(caller.clone()), metadata, 0u32.into());

		assert!(Profiles::<T>::contains_key(&caller));
	}

	#[benchmark]
	fn update_metadata() {
		let caller: T::AccountId = whitelisted_caller();
		let metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmProfileCid123".to_vec()).unwrap();
		let new_metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmUpdatedCid456".to_vec()).unwrap();

		let bond = T::ProfileBond::get();
		let deposit = bond.saturating_mul(2u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);

		let block_number = frame_system::Pallet::<T>::block_number();
		Profiles::<T>::insert(&caller, types::ProfileInfo { metadata, follow_fee: 0u32.into(), created_at: block_number });
		T::Currency::reserve(&caller, bond).unwrap();
		ProfileCount::<T>::put(1u32);

		#[extrinsic_call]
		update_metadata(RawOrigin::Signed(caller.clone()), new_metadata);

		let profile = Profiles::<T>::get(&caller).unwrap();
		assert_eq!(profile.metadata.as_slice(), b"QmUpdatedCid456");
	}

	#[benchmark]
	fn delete_profile() {
		let caller: T::AccountId = whitelisted_caller();
		let metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmProfileCid123".to_vec()).unwrap();

		let bond = T::ProfileBond::get();
		let deposit = bond.saturating_mul(2u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);

		let block_number = frame_system::Pallet::<T>::block_number();
		Profiles::<T>::insert(&caller, types::ProfileInfo { metadata, follow_fee: 0u32.into(), created_at: block_number });
		T::Currency::reserve(&caller, bond).unwrap();
		ProfileCount::<T>::put(1u32);

		#[extrinsic_call]
		delete_profile(RawOrigin::Signed(caller.clone()));

		assert!(!Profiles::<T>::contains_key(&caller));
	}

	impl_benchmark_test_suite!(SocialProfiles, crate::mock::new_test_ext(), crate::mock::Test);
}

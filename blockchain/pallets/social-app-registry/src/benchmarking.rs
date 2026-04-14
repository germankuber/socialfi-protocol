//! Benchmarking setup for pallet-social-app-registry

use super::*;
use frame::{deps::frame_benchmarking::v2::*, prelude::*};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialAppRegistry;
	use frame_system::RawOrigin;

	#[benchmark]
	fn register_app() {
		let caller: T::AccountId = whitelisted_caller();
		let metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmTestCid12345".to_vec()).unwrap();

		// Fund the caller so they can pay the bond.
		let bond = T::AppBond::get();
		let deposit = bond.saturating_mul(2u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);

		#[extrinsic_call]
		register_app(RawOrigin::Signed(caller.clone()), metadata);

		// First registration gets ID 0 (NextAppId starts at Default::default()).
		assert!(Apps::<T>::contains_key(T::AppId::default()));
	}

	#[benchmark]
	fn deregister_app() {
		let caller: T::AccountId = whitelisted_caller();
		let metadata: BoundedVec<u8, T::MaxMetadataLen> =
			BoundedVec::try_from(b"QmTestCid12345".to_vec()).unwrap();

		let bond = T::AppBond::get();
		let deposit = bond.saturating_mul(2u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);

		// Register via the extrinsic to populate all storage (Apps + AppsByOwner).
		let app_id = T::AppId::default();
		let block_number = frame_system::Pallet::<T>::block_number();
		Apps::<T>::insert(
			app_id,
			types::AppInfo {
				owner: caller.clone(),
				metadata,
				created_at: block_number,
				status: types::AppStatus::Active,
			},
		);
		let mut next = app_id;
		next += T::AppId::from(1u32);
		NextAppId::<T>::put(next);
		AppsByOwner::<T>::try_mutate(&caller, |apps| apps.try_push(app_id)).unwrap();
		T::Currency::reserve(&caller, bond).unwrap();

		#[extrinsic_call]
		deregister_app(RawOrigin::Signed(caller.clone()), app_id);

		let app = Apps::<T>::get(app_id).unwrap();
		assert_eq!(app.status, types::AppStatus::Inactive);
	}

	impl_benchmark_test_suite!(SocialAppRegistry, crate::mock::new_test_ext(), crate::mock::Test);
}

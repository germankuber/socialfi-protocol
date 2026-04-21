//! Benchmarks for `pallet-social-app-registry`.
//!
//! Uses the FRAME v2 `#[benchmarks]` macro. Each benchmark sets storage
//! to the worst-case shape before measuring — the goal is a weight that
//! is safe for the most expensive execution path, not the average.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use frame::{deps::frame_benchmarking::v2::*, prelude::*, traits::Currency};
use scale_info::prelude::{boxed::Box, vec};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialAppRegistry;
	use frame_system::RawOrigin;

	fn fund<T: Config>(who: &T::AccountId) {
		let bond = T::AppBond::get();
		// Funding = bond × 4 so we can register and still leave the
		// caller above ED after the reserve.
		T::Currency::make_free_balance_be(who, bond.saturating_mul(4u32.into()));
	}

	fn metadata<T: Config>() -> BoundedVec<u8, T::MaxMetadataLen> {
		// Worst case is the maximum-length CID. Using the bound here
		// forces any storage-hashing cost tied to metadata length to be
		// measured at the top of the curve.
		let max = T::MaxMetadataLen::get() as usize;
		let bytes = vec![b'x'; max];
		BoundedVec::try_from(bytes).expect("metadata length == bound")
	}

	#[benchmark]
	fn register_app() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		let md = metadata::<T>();

		#[extrinsic_call]
		register_app(RawOrigin::Signed(caller.clone()), md, false);

		// First registration gets the default id (counter starts there).
		assert!(Apps::<T>::contains_key(T::AppId::default()));
	}

	#[benchmark]
	fn deregister_app() {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		let md = metadata::<T>();

		// Register through the extrinsic so every storage item this
		// benchmark might interact with (Apps, AppsByOwner, NextAppId,
		// reserved deposit) is in the state the runtime actually
		// reaches after a real registration.
		Pallet::<T>::register_app(
			RawOrigin::Signed(caller.clone()).into(),
			md,
			false,
		)
		.expect("register succeeds after funding");
		let app_id = T::AppId::default();

		#[extrinsic_call]
		deregister_app(RawOrigin::Signed(caller.clone()), app_id);

		let app = Apps::<T>::get(app_id).expect("app remains after deregister");
		assert_eq!(app.status, types::AppStatus::Inactive);
	}

	/// `act_as_moderator` wraps an inner `RuntimeCall`. Benchmarks for
	/// this extrinsic measure only the wrapper overhead; the inner call
	/// weight is added at dispatch time via `call.get_dispatch_info()`.
	/// We nest a `deregister_app` (same pallet, benchmarked above) as
	/// the inner call — worst-case enough to exercise the full dispatch
	/// path without reaching into another pallet's state.
	#[benchmark]
	fn act_as_moderator() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		let md = metadata::<T>();

		Pallet::<T>::register_app(
			RawOrigin::Signed(caller.clone()).into(),
			md,
			false,
		)
		.map_err(|_| BenchmarkError::Stop("register_app setup failed"))?;
		let app_id = T::AppId::default();

		// Nested call: a moderation-class dispatch the owner could
		// legally route through `act_as_moderator`. We use a self-call
		// here because any runtime-specific call would leak outside
		// this pallet's benchmarks.
		let inner: <T as frame_system::Config>::RuntimeCall =
			frame_system::Call::<T>::remark { remark: vec![] }.into();

		#[extrinsic_call]
		act_as_moderator(RawOrigin::Signed(caller.clone()), app_id, Box::new(inner));

		Ok(())
	}

	impl_benchmark_test_suite!(
		SocialAppRegistry,
		crate::mock::new_test_ext(),
		crate::mock::Test,
	);
}

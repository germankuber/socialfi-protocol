//! Benchmarks for `pallet-sponsorship`.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::pallet::{BeneficiaryCount, SponsorOf, SponsorPots};
use frame::{deps::frame_benchmarking::v2::*, prelude::*, traits::Currency};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as Sponsorship;
	use frame_system::RawOrigin;

	const SEED: u32 = 0;

	fn fund<T: Config>(who: &T::AccountId) {
		T::Currency::make_free_balance_be(
			who,
			T::MinimumPotBalance::get().saturating_mul(1_000u32.into()),
		);
	}

	#[benchmark]
	fn register_beneficiary() {
		let sponsor: T::AccountId = whitelisted_caller();
		let beneficiary: T::AccountId = account("beneficiary", 0, SEED);
		fund::<T>(&sponsor);

		#[extrinsic_call]
		register_beneficiary(RawOrigin::Signed(sponsor.clone()), beneficiary.clone());

		assert_eq!(SponsorOf::<T>::get(&beneficiary), Some(sponsor.clone()));
		assert_eq!(BeneficiaryCount::<T>::get(&sponsor), 1);
	}

	#[benchmark]
	fn revoke_beneficiary() {
		let sponsor: T::AccountId = whitelisted_caller();
		let beneficiary: T::AccountId = account("beneficiary", 0, SEED);
		fund::<T>(&sponsor);
		SponsorOf::<T>::insert(&beneficiary, &sponsor);
		BeneficiaryCount::<T>::insert(&sponsor, 1u32);

		#[extrinsic_call]
		revoke_beneficiary(RawOrigin::Signed(sponsor.clone()), beneficiary.clone());

		assert!(SponsorOf::<T>::get(&beneficiary).is_none());
	}

	#[benchmark]
	fn revoke_my_sponsor() {
		let sponsor: T::AccountId = account("sponsor", 0, SEED);
		let beneficiary: T::AccountId = whitelisted_caller();
		fund::<T>(&sponsor);
		SponsorOf::<T>::insert(&beneficiary, &sponsor);
		BeneficiaryCount::<T>::insert(&sponsor, 1u32);

		#[extrinsic_call]
		revoke_my_sponsor(RawOrigin::Signed(beneficiary.clone()));

		assert!(SponsorOf::<T>::get(&beneficiary).is_none());
	}

	#[benchmark]
	fn top_up() {
		let sponsor: T::AccountId = whitelisted_caller();
		fund::<T>(&sponsor);
		let amount = T::MinimumPotBalance::get().saturating_mul(10u32.into());

		#[extrinsic_call]
		top_up(RawOrigin::Signed(sponsor.clone()), amount);

		assert_eq!(SponsorPots::<T>::get(&sponsor), amount);
	}

	#[benchmark]
	fn withdraw() -> Result<(), BenchmarkError> {
		let sponsor: T::AccountId = whitelisted_caller();
		fund::<T>(&sponsor);
		let topped = T::MinimumPotBalance::get().saturating_mul(10u32.into());
		// Use the real extrinsic to populate both the pot bookkeeping
		// and the pallet-account's free balance in sync — otherwise
		// `withdraw` would trip the PotAccountingMismatch guard.
		crate::pallet::Pallet::<T>::top_up(RawOrigin::Signed(sponsor.clone()).into(), topped)
			.map_err(|_| BenchmarkError::Stop("top_up setup failed"))?;

		#[extrinsic_call]
		withdraw(RawOrigin::Signed(sponsor.clone()), topped);

		assert_eq!(SponsorPots::<T>::get(&sponsor), 0u32.into());
		Ok(())
	}

	impl_benchmark_test_suite!(
		Sponsorship,
		crate::mock::new_test_ext(),
		crate::mock::Test,
	);
}

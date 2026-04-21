//! Unit tests for `pallet-sponsorship`.
//!
//! Focus: pot bookkeeping invariants (top-up / withdraw), beneficiary
//! registration lifecycle, and the error path that replaced the old
//! `.expect()` in `withdraw`.

use crate::{
	mock::{new_test_ext, Balances, RuntimeOrigin, Sponsorship, Test, BENEFICIARY, OTHER, SPONSOR},
	pallet::{BeneficiaryCount, Error, SponsorOf, SponsorPots},
};
use frame::{deps::frame_support::assert_noop, testing_prelude::*};

#[test]
fn top_up_moves_funds_into_pot() {
	new_test_ext().execute_with(|| {
		let before = Balances::free_balance(SPONSOR);
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		assert_eq!(Balances::free_balance(SPONSOR), before - 500);
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 500);
	});
}

#[test]
fn withdraw_refunds_sponsor() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		let before = Balances::free_balance(SPONSOR);
		assert_ok!(Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 200));
		assert_eq!(Balances::free_balance(SPONSOR), before + 200);
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 300);
	});
}

#[test]
fn withdraw_fails_exceeds_pot() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 100));
		assert_noop!(
			Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 101),
			Error::<Test>::WithdrawalExceedsPot
		);
	});
}

#[test]
fn withdraw_happy_path_no_longer_panics() {
	// Regression: previous implementation used `.expect()` after the
	// transfer, which would panic under a corrupted pot/account-balance
	// invariant. The current code returns `PotAccountingMismatch` —
	// we exercise the happy path here to confirm the replacement
	// compiles and preserves the successful case.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 1_000));
		assert_ok!(Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 1_000));
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 0);
	});
}

#[test]
fn register_beneficiary_sets_pointer_and_counter() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_eq!(SponsorOf::<Test>::get(BENEFICIARY), Some(SPONSOR));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 1);
	});
}

#[test]
fn register_beneficiary_rejects_self_sponsor() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			Sponsorship::register_beneficiary(RuntimeOrigin::signed(SPONSOR), SPONSOR),
			Error::<Test>::CannotSponsorSelf
		);
	});
}

#[test]
fn register_beneficiary_reassignment_updates_counters() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 1);
		// OTHER steals the beneficiary.
		assert_ok!(Sponsorship::register_beneficiary(RuntimeOrigin::signed(OTHER), BENEFICIARY));
		assert_eq!(SponsorOf::<Test>::get(BENEFICIARY), Some(OTHER));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 0);
		assert_eq!(BeneficiaryCount::<Test>::get(OTHER), 1);
	});
}

#[test]
fn revoke_beneficiary_removes_pointer() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::revoke_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert!(SponsorOf::<Test>::get(BENEFICIARY).is_none());
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 0);
	});
}

#[test]
fn revoke_beneficiary_rejects_non_sponsor() {
	// OTHER cannot revoke SPONSOR's beneficiary.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_noop!(
			Sponsorship::revoke_beneficiary(RuntimeOrigin::signed(OTHER), BENEFICIARY),
			Error::<Test>::NotYourBeneficiary
		);
	});
}

#[test]
fn revoke_my_sponsor_is_the_beneficiary_escape_hatch() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::revoke_my_sponsor(RuntimeOrigin::signed(BENEFICIARY)));
		assert!(SponsorOf::<Test>::get(BENEFICIARY).is_none());
	});
}

#[test]
fn resolve_sponsor_honors_minimum_pot_balance() {
	// resolve_sponsor returns None when the pot is below the minimum
	// threshold, even if the pointer exists and the balance is positive.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 5)); // under MinimumPotBalance=10
		assert!(crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 1).is_none());

		// Top up to cross the threshold.
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 10));
		assert_eq!(
			crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 1),
			Some(SPONSOR)
		);
	});
}

#[test]
fn resolve_sponsor_returns_none_when_fee_exceeds_pot() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 50));
		// fee (100) > pot (50).
		assert!(crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 100).is_none());
		// fee (30) ≤ pot (50).
		assert_eq!(
			crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 30),
			Some(SPONSOR)
		);
	});
}

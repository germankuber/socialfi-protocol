//! Unit tests for `pallet-social-managers`.
//!
//! The suite focuses on the three properties that are easy to regress:
//!
//! 1. Authorization lifecycle (add / remove / remove_all / expiry purge).
//! 2. Scope enforcement — `act_as_manager` dispatches only calls whose required scope is present in
//!    the authorized bitmask.
//! 3. Anti-escalation — the dynamic filter rejects attempts to route non-social, self-management,
//!    or unknown calls through a manager.

use crate::{
	mock::{
		dummy_feeds, new_test_ext, RuntimeCall, RuntimeOrigin, SocialManagers, System, Test, ALICE,
		BOB, CAROL,
	},
	types::{ManagerScope, ScopeMask},
	Error, ManagerCount, ProfileManagers,
};
use frame::{deps::frame_support::assert_noop, prelude::*, testing_prelude::*};
use polkadot_sdk::pallet_balances;

/// Helper: the `RuntimeCall` variant that represents "post as Alice" — the
/// canonical happy-path call we dispatch through `act_as_manager`.
fn post_call() -> Box<RuntimeCall> {
	Box::new(RuntimeCall::SocialFeeds(dummy_feeds::Call::create_post {}))
}

/// Helper: call that requires `UpdateProfile`, used to check scope routing.
fn update_profile_call() -> Box<RuntimeCall> {
	Box::new(RuntimeCall::SocialProfiles(crate::mock::dummy_profiles::Call::set_follow_fee {}))
}

/// Helper: a call to this pallet itself — should always be rejected by the
/// dynamic filter, regardless of the authorized scope set.
fn self_add_manager_call() -> Box<RuntimeCall> {
	Box::new(RuntimeCall::SocialManagers(crate::Call::add_manager {
		manager: CAROL,
		scopes: ScopeMask::from_scopes(&[ManagerScope::Post]),
		expires_at: None,
	}))
}

#[test]
fn add_manager_reserves_deposit_and_records_entry() {
	new_test_ext().execute_with(|| {
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None,));

		let info = ProfileManagers::<Test>::get(ALICE, BOB).expect("record written");
		assert_eq!(info.scopes, scopes);
		assert_eq!(info.expires_at, None);
		assert_eq!(info.deposit, 10);
		assert_eq!(ManagerCount::<Test>::get(ALICE), 1);

		// 10 of Alice's balance is reserved; the remaining 990 is free.
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 10);
	});
}

#[test]
fn add_manager_rejects_self_delegation() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialManagers::add_manager(
				RuntimeOrigin::signed(ALICE),
				ALICE,
				ScopeMask::from_scopes(&[ManagerScope::Post]),
				None,
			),
			Error::<Test>::ManagerCannotBeSelf,
		);
	});
}

#[test]
fn add_manager_rejects_empty_scope_set() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, ScopeMask(0), None,),
			Error::<Test>::EmptyScopeSet,
		);
	});
}

#[test]
fn add_manager_rejects_duplicate() {
	new_test_ext().execute_with(|| {
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_noop!(
			SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None,),
			Error::<Test>::ManagerAlreadyExists,
		);
	});
}

#[test]
fn add_manager_rejects_past_expiry() {
	new_test_ext().execute_with(|| {
		System::set_block_number(100);
		assert_noop!(
			SocialManagers::add_manager(
				RuntimeOrigin::signed(ALICE),
				BOB,
				ScopeMask::from_scopes(&[ManagerScope::Post]),
				Some(50),
			),
			Error::<Test>::ExpirationInPast,
		);
	});
}

#[test]
fn add_manager_enforces_cap() {
	new_test_ext().execute_with(|| {
		// MaxManagersPerOwner = 4 in the mock.
		for i in 10u64..14 {
			assert_ok!(SocialManagers::add_manager(
				RuntimeOrigin::signed(ALICE),
				i,
				ScopeMask::from_scopes(&[ManagerScope::Post]),
				None,
			));
		}
		assert_noop!(
			SocialManagers::add_manager(
				RuntimeOrigin::signed(ALICE),
				100,
				ScopeMask::from_scopes(&[ManagerScope::Post]),
				None,
			),
			Error::<Test>::TooManyManagers,
		);
	});
}

#[test]
fn remove_manager_releases_deposit() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask::from_scopes(&[ManagerScope::Post]),
			None,
		));
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 10);

		assert_ok!(SocialManagers::remove_manager(RuntimeOrigin::signed(ALICE), BOB));

		assert!(ProfileManagers::<Test>::get(ALICE, BOB).is_none());
		assert_eq!(ManagerCount::<Test>::get(ALICE), 0);
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 0);
	});
}

#[test]
fn remove_manager_requires_existing_entry() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialManagers::remove_manager(RuntimeOrigin::signed(ALICE), BOB),
			Error::<Test>::ManagerNotFound,
		);
	});
}

#[test]
fn remove_all_managers_wipes_everything_and_refunds() {
	new_test_ext().execute_with(|| {
		for m in [BOB, CAROL] {
			assert_ok!(SocialManagers::add_manager(
				RuntimeOrigin::signed(ALICE),
				m,
				ScopeMask::from_scopes(&[ManagerScope::Post]),
				None,
			));
		}
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 20);

		assert_ok!(SocialManagers::remove_all_managers(RuntimeOrigin::signed(ALICE)));

		assert_eq!(ManagerCount::<Test>::get(ALICE), 0);
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 0);
		assert!(ProfileManagers::<Test>::iter_prefix(ALICE).next().is_none());
	});
}

#[test]
fn act_as_manager_dispatches_post_with_authorized_scope() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask::from_scopes(&[ManagerScope::Post]),
			None,
		));

		assert_ok!(SocialManagers::act_as_manager(RuntimeOrigin::signed(BOB), ALICE, post_call(),));

		// The dummy feeds pallet recorded the call's caller. Because the
		// synthesized origin carried Alice, the stored author is Alice —
		// which is the entire point of the pallet.
		assert_eq!(dummy_feeds::LastAuthor::<Test>::get(), Some(ALICE));
	});
}

#[test]
fn act_as_manager_rejects_unauthorized_scope() {
	new_test_ext().execute_with(|| {
		// Bob has Post but not UpdateProfile.
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask::from_scopes(&[ManagerScope::Post]),
			None,
		));

		assert_noop!(
			SocialManagers::act_as_manager(
				RuntimeOrigin::signed(BOB),
				ALICE,
				update_profile_call(),
			),
			Error::<Test>::ScopeNotAuthorized,
		);
	});
}

#[test]
fn act_as_manager_rejects_non_delegatable_call() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask(ManagerScope::ALL),
			None,
		));

		// A call to this pallet itself — must be rejected by the outer
		// `required_scope` check (before the filter is even installed).
		assert_noop!(
			SocialManagers::act_as_manager(
				RuntimeOrigin::signed(BOB),
				ALICE,
				self_add_manager_call(),
			),
			Error::<Test>::CallNotDelegatable,
		);
	});
}

#[test]
fn act_as_manager_rejects_missing_entry() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialManagers::act_as_manager(RuntimeOrigin::signed(BOB), ALICE, post_call(),),
			Error::<Test>::ManagerNotFound,
		);
	});
}

#[test]
fn act_as_manager_rejects_expired_authorization() {
	new_test_ext().execute_with(|| {
		System::set_block_number(10);
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask::from_scopes(&[ManagerScope::Post]),
			Some(20),
		));

		System::set_block_number(25);
		assert_noop!(
			SocialManagers::act_as_manager(RuntimeOrigin::signed(BOB), ALICE, post_call(),),
			Error::<Test>::ManagerExpired,
		);
	});
}

#[test]
fn on_idle_purges_expired_entries() {
	new_test_ext().execute_with(|| {
		System::set_block_number(10);
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			ScopeMask::from_scopes(&[ManagerScope::Post]),
			Some(15),
		));
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 10);

		// Advance past the expiry and run `on_idle` with generous weight.
		System::set_block_number(20);
		let _ = <SocialManagers as Hooks<u64>>::on_idle(
			20,
			Weight::from_parts(1_000_000_000, 1_000_000),
		);

		assert!(ProfileManagers::<Test>::get(ALICE, BOB).is_none());
		assert_eq!(ManagerCount::<Test>::get(ALICE), 0);
		assert_eq!(pallet_balances::Pallet::<Test>::reserved_balance(ALICE), 0);
	});
}

#[test]
fn scope_mask_contains_semantics() {
	let mask = ScopeMask::from_scopes(&[ManagerScope::Post, ManagerScope::Comment]);
	assert!(mask.contains(ManagerScope::Post));
	assert!(mask.contains(ManagerScope::Comment));
	assert!(!mask.contains(ManagerScope::Follow));
	assert!(!mask.is_empty());
	assert!(ScopeMask::default().is_empty());
}

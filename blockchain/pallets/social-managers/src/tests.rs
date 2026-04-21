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
		dummy_feeds, new_test_ext, RuntimeCall, RuntimeEvent, RuntimeOrigin, SocialManagers,
		System, Test, ALICE, BOB, CAROL,
	},
	types::{ManagerScope, ScopeMask},
	Error, ManagerCount, ProfileManagers,
};
use frame::{deps::frame_support::assert_noop, prelude::*, testing_prelude::*};
use polkadot_sdk::pallet_balances;

/// Helper: the `RuntimeCall` variant that represents "post as Alice" — the
/// canonical happy-path call we dispatch through `act_as_manager`.
fn post_call() -> Box<RuntimeCall> {
	Box::new(RuntimeCall::SocialFeeds(dummy_feeds::Call::create_post { should_fail: false }))
}

fn post_call_failing() -> Box<RuntimeCall> {
	Box::new(RuntimeCall::SocialFeeds(dummy_feeds::Call::create_post { should_fail: true }))
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
fn on_idle_bills_scan_weight_for_non_expired_entries() {
	// Regression guard: the hook used to only bill weight for purges,
	// letting an attacker fill storage with non-expired entries and drain
	// reads for free. The scan reads MUST count toward `used` weight.
	new_test_ext().execute_with(|| {
		System::set_block_number(5);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		// Alice adds 3 never-expiring managers (BOB, CAROL, and a third).
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), CAROL, scopes, None));
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), 4u64, scopes, None));

		System::set_block_number(10);
		let used = <SocialManagers as Hooks<u64>>::on_idle(
			10,
			Weight::from_parts(1_000_000_000, 1_000_000),
		);
		// 3 entries scanned, 0 purged. Used weight must be non-zero and
		// equal to exactly 3 DB reads.
		let expected = <Test as frame_system::Config>::DbWeight::get().reads(3);
		assert_eq!(used, expected);
		// All 3 still present.
		assert_eq!(ManagerCount::<Test>::get(ALICE), 3);
	});
}

#[test]
fn on_idle_respects_scan_budget() {
	// When scan budget is the binding constraint, the hook must stop
	// after `MaxExpiryScanPerBlock` reads — regardless of whether it
	// found enough expirables to hit the purge budget.
	new_test_ext().execute_with(|| {
		// Reduce MaxExpiryScanPerBlock by bypassing the Config type: we
		// instead verify the *invariant* that used weight never exceeds
		// `scan_budget * 1_read + purge_budget * 2_writes` even with
		// many entries. With budgets 32/8, that's a known ceiling.
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		// Insert MaxManagersPerOwner (4) entries for each of 10 owners —
		// 40 total, comfortably above the scan budget of 32.
		for owner in 10u64..20 {
			// Fund owner so add_manager's reserve succeeds.
			let _ = pallet_balances::Pallet::<Test>::force_set_balance(
				RuntimeOrigin::root(),
				owner,
				1_000,
			);
			for mgr in 100u64..104 {
				assert_ok!(SocialManagers::add_manager(
					RuntimeOrigin::signed(owner),
					owner * 1000 + mgr,
					scopes,
					None,
				));
			}
		}

		let used = <SocialManagers as Hooks<u64>>::on_idle(
			5,
			Weight::from_parts(1_000_000_000, 1_000_000),
		);

		let db = <Test as frame_system::Config>::DbWeight::get();
		let max_possible = db.reads(32);
		// used must be EXACTLY 32 reads — scan budget saturated, no purges.
		assert_eq!(used, max_possible);
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

// ── event assertions ──────────────────────────────────────────────────
//
// Event payloads are the public contract with indexers / UIs — the
// sibling `social-app-registry` already asserts on them, so aligning
// this pallet closes a drift point.

#[test]
fn add_manager_emits_manager_added_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		System::assert_last_event(
			crate::Event::ManagerAdded {
				owner: ALICE,
				manager: BOB,
				scopes,
				expires_at: None,
				deposit: 10,
			}
			.into(),
		);
	});
}

#[test]
fn remove_manager_emits_manager_removed_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_ok!(SocialManagers::remove_manager(RuntimeOrigin::signed(ALICE), BOB));
		System::assert_last_event(
			crate::Event::ManagerRemoved { owner: ALICE, manager: BOB, deposit_released: 10 }
				.into(),
		);
	});
}

#[test]
fn remove_all_managers_emits_event_with_count() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), CAROL, scopes, None));
		assert_ok!(SocialManagers::remove_all_managers(RuntimeOrigin::signed(ALICE)));
		System::assert_last_event(
			crate::Event::AllManagersRemoved {
				owner: ALICE,
				removed_count: 2,
				deposit_released: 20,
			}
			.into(),
		);
	});
}

#[test]
fn act_as_manager_emits_event_with_ok_result() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_ok!(SocialManagers::act_as_manager(RuntimeOrigin::signed(BOB), ALICE, post_call()));

		// `ActedAsManager` is not the last event (the inner `PostCreated`
		// fires after), so scan all events.
		let acted = System::events().into_iter().any(|r| {
			matches!(
				r.event,
				RuntimeEvent::SocialManagers(crate::Event::ActedAsManager {
					owner: ALICE,
					manager: BOB,
					result: Ok(()),
				})
			)
		});
		assert!(acted, "ActedAsManager with Ok result missing");
	});
}

#[test]
fn act_as_manager_emits_event_with_err_result() {
	// Inner dispatch fails — `act_as_manager` must still emit the event
	// (with `result: Err(_)`) and return `Ok` to keep the extrinsic's
	// post-dispatch weight/fee bookkeeping intact.
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(RuntimeOrigin::signed(ALICE), BOB, scopes, None));
		assert_ok!(SocialManagers::act_as_manager(
			RuntimeOrigin::signed(BOB),
			ALICE,
			post_call_failing(),
		));

		let acted_err = System::events().into_iter().any(|r| {
			matches!(
				r.event,
				RuntimeEvent::SocialManagers(crate::Event::ActedAsManager {
					owner: ALICE,
					manager: BOB,
					result: Err(_),
				})
			)
		});
		assert!(acted_err, "ActedAsManager with Err result missing");
	});
}

#[test]
fn on_idle_emits_expired_manager_purged_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(10);
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_ok!(SocialManagers::add_manager(
			RuntimeOrigin::signed(ALICE),
			BOB,
			scopes,
			Some(20),
		));

		System::set_block_number(30); // past expiry
		let _ = SocialManagers::on_idle(30, Weight::MAX);

		let purged = System::events().into_iter().any(|r| {
			matches!(
				r.event,
				RuntimeEvent::SocialManagers(crate::Event::ExpiredManagerPurged {
					owner: ALICE,
					manager: BOB,
					..
				})
			)
		});
		assert!(purged, "ExpiredManagerPurged event missing");
	});
}

// ── BadOrigin ──────────────────────────────────────────────────────────

#[test]
fn extrinsics_reject_unsigned_origin() {
	// All 4 extrinsics gate on plain `ensure_signed`. One consolidated
	// test documents the invariant.
	new_test_ext().execute_with(|| {
		let scopes = ScopeMask::from_scopes(&[ManagerScope::Post]);
		assert_noop!(
			SocialManagers::add_manager(RuntimeOrigin::none(), BOB, scopes, None),
			frame::deps::sp_runtime::DispatchError::BadOrigin,
		);
		assert_noop!(
			SocialManagers::remove_manager(RuntimeOrigin::none(), BOB),
			frame::deps::sp_runtime::DispatchError::BadOrigin,
		);
		assert_noop!(
			SocialManagers::remove_all_managers(RuntimeOrigin::none()),
			frame::deps::sp_runtime::DispatchError::BadOrigin,
		);
		assert_noop!(
			SocialManagers::act_as_manager(RuntimeOrigin::none(), ALICE, post_call()),
			frame::deps::sp_runtime::DispatchError::BadOrigin,
		);
	});
}

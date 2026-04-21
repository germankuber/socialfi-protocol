use crate::{
	mock::*,
	pallet::{Apps, AppsByOwner, Error, NextAppId},
	types::AppStatus,
};
use frame::{testing_prelude::*, traits::Currency};

fn test_metadata() -> BoundedVec<u8, MaxMetadataLen> {
	BoundedVec::try_from(b"QmTestCid12345".to_vec()).unwrap()
}

// ── register_app ───────────────────────────────────────────────────────

#[test]
fn register_app_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));

		let app = Apps::<Test>::get(0).expect("app should exist");
		assert_eq!(app.owner, 1);
		assert_eq!(app.status, AppStatus::Active);
		assert_eq!(app.metadata.as_slice(), b"QmTestCid12345");
	});
}

#[test]
fn register_app_increments_id() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));

		assert_eq!(NextAppId::<Test>::get(), 2);
		assert!(Apps::<Test>::contains_key(0));
		assert!(Apps::<Test>::contains_key(1));
	});
}

#[test]
fn register_app_reserves_bond() {
	new_test_ext().execute_with(|| {
		let free_before = Balances::free_balance(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		let free_after = Balances::free_balance(1);

		assert_eq!(free_before - free_after, 100);
		assert_eq!(Balances::reserved_balance(1), 100);
	});
}

#[test]
fn register_app_updates_owner_index() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));

		let owned = AppsByOwner::<Test>::get(1);
		assert_eq!(owned.as_slice(), &[0, 1]);
	});
}

#[test]
fn register_app_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		System::assert_last_event(crate::Event::AppRegistered { app_id: 0, owner: 1 }.into());
	});
}

#[test]
fn register_app_emits_owner_limit_reached_on_last_slot() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		Balances::make_free_balance_be(&2, 2_000);
		let cap = MaxAppsPerOwner::get();

		// Registrations before the cap must NOT emit the limit event.
		for _ in 0..cap - 1 {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
			// The latest event is AppRegistered, not OwnerAppLimitReached.
			let events = System::events();
			let last = events.last().expect("at least one event");
			assert!(
				!matches!(last.event, RuntimeEvent::SocialAppRegistry(crate::Event::OwnerAppLimitReached { .. })),
				"cap event fired prematurely"
			);
		}

		// The last allowed registration hits the cap exactly — must emit.
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		System::assert_last_event(
			crate::Event::OwnerAppLimitReached { owner: 2, cap }.into(),
		);
	});
}

#[test]
fn register_app_does_not_reemit_owner_limit_after_deregister_register() {
	// After deregistering an app and re-registering, the owner once again
	// fills the last slot — the cap event must fire on that re-fill too.
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		Balances::make_free_balance_be(&2, 2_000);
		let cap = MaxAppsPerOwner::get();

		for _ in 0..cap {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		}
		// Free slot by deregistering the first app.
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(2), 0));
		// Re-register — fills the last slot again.
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		System::assert_last_event(
			crate::Event::OwnerAppLimitReached { owner: 2, cap }.into(),
		);
	});
}

#[test]
fn register_app_records_block_number() {
	new_test_ext().execute_with(|| {
		System::set_block_number(42);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));

		let app = Apps::<Test>::get(0).unwrap();
		assert_eq!(app.created_at, 42);
	});
}

#[test]
fn register_app_fails_insufficient_bond() {
	new_test_ext().execute_with(|| {
		// Account 3 has only 50, bond is 100.
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(3), test_metadata(), false),
			Error::<Test>::InsufficientBond,
		);
	});
}

#[test]
fn register_app_fails_too_many_apps() {
	new_test_ext().execute_with(|| {
		// Give account 2 enough balance for (cap + 1) bonds.
		Balances::make_free_balance_be(&2, 2_000);

		let cap = MaxAppsPerOwner::get();
		for _ in 0..cap {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		}
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false),
			Error::<Test>::TooManyApps,
		);
	});
}

#[test]
fn register_app_too_many_apps_does_not_lock_bond() {
	new_test_ext().execute_with(|| {
		// CRITICAL fix test: when TooManyApps is hit, bond must NOT be reserved.
		Balances::make_free_balance_be(&2, 2_000);

		let cap = MaxAppsPerOwner::get();
		for _ in 0..cap {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		}
		let reserved_before = Balances::reserved_balance(2);
		let free_before = Balances::free_balance(2);

		// 11th fails.
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false),
			Error::<Test>::TooManyApps,
		);

		// Bond unchanged — no funds locked by the failed call.
		assert_eq!(Balances::reserved_balance(2), reserved_before);
		assert_eq!(Balances::free_balance(2), free_before);
	});
}

#[test]
fn register_app_insufficient_bond_does_not_mutate_storage() {
	new_test_ext().execute_with(|| {
		let next_id_before = NextAppId::<Test>::get();

		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(3), test_metadata(), false),
			Error::<Test>::InsufficientBond,
		);

		// NextAppId unchanged — no ID leak.
		assert_eq!(NextAppId::<Test>::get(), next_id_before);
		assert!(AppsByOwner::<Test>::get(3).is_empty());
	});
}

#[test]
fn register_app_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::none(), test_metadata(), false),
			DispatchError::BadOrigin,
		);
	});
}

// ── deregister_app ─────────────────────────────────────────────────────

#[test]
fn deregister_app_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));

		let app = Apps::<Test>::get(0).unwrap();
		assert_eq!(app.status, AppStatus::Inactive);
	});
}

#[test]
fn deregister_app_unreserves_bond() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_eq!(Balances::reserved_balance(1), 100);

		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));
		assert_eq!(Balances::reserved_balance(1), 0);
		assert_eq!(Balances::free_balance(1), 1_000);
	});
}

#[test]
fn deregister_app_removes_from_owner_index() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_eq!(AppsByOwner::<Test>::get(1).len(), 2);

		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));
		let owned = AppsByOwner::<Test>::get(1);
		assert_eq!(owned.as_slice(), &[1]); // only app 1 remains
	});
}

#[test]
fn deregister_app_frees_owner_slot() {
	new_test_ext().execute_with(|| {
		// HIGH fix test: after deregistering, the owner should be able to
		// register a new app in the freed slot.
		Balances::make_free_balance_be(&2, 2_000);

		let cap = MaxAppsPerOwner::get();
		for _ in 0..cap {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
		}
		// At limit — cannot register more.
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false),
			Error::<Test>::TooManyApps,
		);

		// Deregister one — should free a slot.
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(2), 0));

		// Now can register again.
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(), false));
	});
}

#[test]
fn deregister_app_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));
		System::assert_last_event(crate::Event::AppDeregistered { app_id: 0, owner: 1 }.into());
	});
}

#[test]
fn deregister_app_fails_not_found() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 99),
			Error::<Test>::AppNotFound,
		);
	});
}

#[test]
fn deregister_app_fails_not_owner() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_noop!(
			SocialAppRegistry::deregister_app(RuntimeOrigin::signed(2), 0),
			Error::<Test>::NotAppOwner,
		);
	});
}

#[test]
fn deregister_app_fails_already_inactive() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));

		assert_noop!(
			SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0),
			Error::<Test>::AppAlreadyInactive,
		);
	});
}

#[test]
fn deregister_app_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_noop!(
			SocialAppRegistry::deregister_app(RuntimeOrigin::none(), 0),
			DispatchError::BadOrigin,
		);
	});
}

// ── immutability ───────────────────────────────────────────────────────

#[test]
fn app_record_preserved_after_deregistration() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), false));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));

		// The record still exists (not deleted).
		let app = Apps::<Test>::get(0).expect("app record should be preserved");
		assert_eq!(app.owner, 1);
		assert_eq!(app.metadata.as_slice(), b"QmTestCid12345");
	});
}

// ── AppProvider trait ──────────────────────────────────────────────────

#[test]
fn app_provider_has_images_returns_false_for_inactive() {
	new_test_ext().execute_with(|| {
		use crate::AppProvider;
		// Register with has_images = true
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), true));
		assert!(<crate::pallet::Pallet<Test> as AppProvider<u64, u32>>::has_images(&0));

		// Deregister — has_images should return false for inactive apps
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));
		assert!(!<crate::pallet::Pallet<Test> as AppProvider<u64, u32>>::has_images(&0));
	});
}

#[test]
fn app_provider_has_images_returns_false_for_nonexistent() {
	new_test_ext().execute_with(|| {
		use crate::AppProvider;
		assert!(!<crate::pallet::Pallet<Test> as AppProvider<u64, u32>>::has_images(&999));
	});
}

#[test]
fn register_app_with_has_images() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata(), true));
		let app = Apps::<Test>::get(0).unwrap();
		assert!(app.has_images);
	});
}

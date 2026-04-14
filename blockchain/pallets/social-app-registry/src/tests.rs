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
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));

		let app = Apps::<Test>::get(0).expect("app should exist");
		assert_eq!(app.owner, 1);
		assert_eq!(app.status, AppStatus::Active);
		assert_eq!(app.metadata.as_slice(), b"QmTestCid12345");
	});
}

#[test]
fn register_app_increments_id() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));

		assert_eq!(NextAppId::<Test>::get(), 2);
		assert!(Apps::<Test>::contains_key(0));
		assert!(Apps::<Test>::contains_key(1));
	});
}

#[test]
fn register_app_reserves_bond() {
	new_test_ext().execute_with(|| {
		let free_before = Balances::free_balance(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		let free_after = Balances::free_balance(1);

		assert_eq!(free_before - free_after, 100);
		assert_eq!(Balances::reserved_balance(1), 100);
	});
}

#[test]
fn register_app_updates_owner_index() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));

		let owned = AppsByOwner::<Test>::get(1);
		assert_eq!(owned.as_slice(), &[0, 1]);
	});
}

#[test]
fn register_app_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		System::assert_last_event(crate::Event::AppRegistered { app_id: 0, owner: 1 }.into());
	});
}

#[test]
fn register_app_records_block_number() {
	new_test_ext().execute_with(|| {
		System::set_block_number(42);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));

		let app = Apps::<Test>::get(0).unwrap();
		assert_eq!(app.created_at, 42);
	});
}

#[test]
fn register_app_fails_insufficient_bond() {
	new_test_ext().execute_with(|| {
		// Account 3 has only 50, bond is 100.
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(3), test_metadata()),
			Error::<Test>::InsufficientBond,
		);
	});
}

#[test]
fn register_app_reserves_bond_until_exhausted() {
	new_test_ext().execute_with(|| {
		// Account 1 has 1_000. Bond is 100 each. Existential deposit may limit
		// how many can be reserved. Eventually the bond reservation fails.
		let mut count = 0u32;
		while SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()).is_ok() {
			count += 1;
		}
		assert!(count > 0);
		assert!(count <= 10);
	});
}

#[test]
fn register_app_fails_too_many_apps_limit() {
	new_test_ext().execute_with(|| {
		// Give account 2 enough balance for 11 bonds.
		Balances::make_free_balance_be(&2, 2_000);

		for _ in 0..10 {
			assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata(),));
		}
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::signed(2), test_metadata()),
			Error::<Test>::TooManyApps,
		);
	});
}

#[test]
fn register_app_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialAppRegistry::register_app(RuntimeOrigin::none(), test_metadata()),
			DispatchError::BadOrigin,
		);
	});
}

// ── deregister_app ─────────────────────────────────────────────────────

#[test]
fn deregister_app_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));

		let app = Apps::<Test>::get(0).unwrap();
		assert_eq!(app.status, AppStatus::Inactive);
	});
}

#[test]
fn deregister_app_unreserves_bond() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_eq!(Balances::reserved_balance(1), 100);

		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));
		assert_eq!(Balances::reserved_balance(1), 0);
		assert_eq!(Balances::free_balance(1), 1_000);
	});
}

#[test]
fn deregister_app_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
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
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_noop!(
			SocialAppRegistry::deregister_app(RuntimeOrigin::signed(2), 0),
			Error::<Test>::NotAppOwner,
		);
	});
}

#[test]
fn deregister_app_fails_already_inactive() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
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
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
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
		assert_ok!(SocialAppRegistry::register_app(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialAppRegistry::deregister_app(RuntimeOrigin::signed(1), 0));

		// The record still exists (not deleted).
		let app = Apps::<Test>::get(0).expect("app record should be preserved");
		assert_eq!(app.owner, 1);
		assert_eq!(app.metadata.as_slice(), b"QmTestCid12345");
	});
}

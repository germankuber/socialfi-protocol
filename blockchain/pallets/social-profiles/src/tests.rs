use crate::{
	mock::*,
	pallet::{Error, ProfileCount, Profiles},
	ProfileProvider,
};
use frame::{testing_prelude::*, traits::Currency};

fn test_metadata() -> BoundedVec<u8, MaxMetadataLen> {
	BoundedVec::try_from(b"QmProfileCid123".to_vec()).unwrap()
}

fn alt_metadata() -> BoundedVec<u8, MaxMetadataLen> {
	BoundedVec::try_from(b"QmUpdatedCid456".to_vec()).unwrap()
}

// ── create_profile ─────────────────────────────────────────────────────

#[test]
fn create_profile_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));

		let profile = Profiles::<Test>::get(1).expect("profile should exist");
		assert_eq!(profile.metadata.as_slice(), b"QmProfileCid123");
	});
}

#[test]
fn create_profile_reserves_bond() {
	new_test_ext().execute_with(|| {
		let free_before = Balances::free_balance(1);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		let free_after = Balances::free_balance(1);

		assert_eq!(free_before - free_after, 100);
		assert_eq!(Balances::reserved_balance(1), 100);
	});
}

#[test]
fn create_profile_records_block_number() {
	new_test_ext().execute_with(|| {
		System::set_block_number(42);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));

		let profile = Profiles::<Test>::get(1).unwrap();
		assert_eq!(profile.created_at, 42);
	});
}

#[test]
fn create_profile_increments_count() {
	new_test_ext().execute_with(|| {
		assert_eq!(ProfileCount::<Test>::get(), 0);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_eq!(ProfileCount::<Test>::get(), 1);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(2), test_metadata()));
		assert_eq!(ProfileCount::<Test>::get(), 2);
	});
}

#[test]
fn create_profile_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		System::assert_last_event(crate::Event::ProfileCreated { account: 1 }.into());
	});
}

#[test]
fn create_profile_fails_if_already_exists() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_noop!(
			SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()),
			Error::<Test>::ProfileAlreadyExists,
		);
	});
}

#[test]
fn create_profile_fails_insufficient_bond() {
	new_test_ext().execute_with(|| {
		// Account 3 has only 50, bond is 100.
		assert_noop!(
			SocialProfiles::create_profile(RuntimeOrigin::signed(3), test_metadata()),
			Error::<Test>::InsufficientBond,
		);
	});
}

#[test]
fn create_profile_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialProfiles::create_profile(RuntimeOrigin::none(), test_metadata()),
			DispatchError::BadOrigin,
		);
	});
}

// ── update_metadata ────────────────────────────────────────────────────

#[test]
fn update_metadata_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialProfiles::update_metadata(RuntimeOrigin::signed(1), alt_metadata()));

		let profile = Profiles::<Test>::get(1).unwrap();
		assert_eq!(profile.metadata.as_slice(), b"QmUpdatedCid456");
	});
}

#[test]
fn update_metadata_preserves_created_at() {
	new_test_ext().execute_with(|| {
		System::set_block_number(10);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));

		System::set_block_number(50);
		assert_ok!(SocialProfiles::update_metadata(RuntimeOrigin::signed(1), alt_metadata()));

		let profile = Profiles::<Test>::get(1).unwrap();
		assert_eq!(profile.created_at, 10);
	});
}

#[test]
fn update_metadata_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialProfiles::update_metadata(RuntimeOrigin::signed(1), alt_metadata()));
		System::assert_last_event(crate::Event::ProfileUpdated { account: 1 }.into());
	});
}

#[test]
fn update_metadata_fails_if_no_profile() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialProfiles::update_metadata(RuntimeOrigin::signed(1), alt_metadata()),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn update_metadata_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialProfiles::update_metadata(RuntimeOrigin::none(), alt_metadata()),
			DispatchError::BadOrigin,
		);
	});
}

// ── delete_profile ─────────────────────────────────────────────────────

#[test]
fn delete_profile_works() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialProfiles::delete_profile(RuntimeOrigin::signed(1)));

		assert!(!Profiles::<Test>::contains_key(1));
	});
}

#[test]
fn delete_profile_unreserves_bond() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_eq!(Balances::reserved_balance(1), 100);

		assert_ok!(SocialProfiles::delete_profile(RuntimeOrigin::signed(1)));
		assert_eq!(Balances::reserved_balance(1), 0);
		assert_eq!(Balances::free_balance(1), 1_000);
	});
}

#[test]
fn delete_profile_decrements_count() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(2), test_metadata()));
		assert_eq!(ProfileCount::<Test>::get(), 2);

		assert_ok!(SocialProfiles::delete_profile(RuntimeOrigin::signed(1)));
		assert_eq!(ProfileCount::<Test>::get(), 1);
	});
}

#[test]
fn delete_profile_emits_event() {
	new_test_ext().execute_with(|| {
		System::set_block_number(1);
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert_ok!(SocialProfiles::delete_profile(RuntimeOrigin::signed(1)));
		System::assert_last_event(crate::Event::ProfileDeleted { account: 1 }.into());
	});
}

#[test]
fn delete_profile_fails_if_no_profile() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialProfiles::delete_profile(RuntimeOrigin::signed(1)),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn delete_profile_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialProfiles::delete_profile(RuntimeOrigin::none()),
			DispatchError::BadOrigin,
		);
	});
}

// ── ProfileProvider trait ──────────────────────────────────────────────

#[test]
fn profile_provider_exists_returns_true_after_create() {
	new_test_ext().execute_with(|| {
		assert!(!<SocialProfiles as ProfileProvider<u64>>::exists(&1));
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert!(<SocialProfiles as ProfileProvider<u64>>::exists(&1));
	});
}

#[test]
fn profile_provider_exists_returns_false_after_delete() {
	new_test_ext().execute_with(|| {
		assert_ok!(SocialProfiles::create_profile(RuntimeOrigin::signed(1), test_metadata()));
		assert!(<SocialProfiles as ProfileProvider<u64>>::exists(&1));

		assert_ok!(SocialProfiles::delete_profile(RuntimeOrigin::signed(1)));
		assert!(!<SocialProfiles as ProfileProvider<u64>>::exists(&1));
	});
}

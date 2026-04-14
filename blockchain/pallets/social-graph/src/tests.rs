use crate::{
	mock::*,
	pallet::{Error, FollowerCount, FollowingCount, Follows},
	GraphProvider,
};
use frame::testing_prelude::*;

fn setup_profiles(accounts: &[u64]) {
	for &acc in accounts {
		MockProfileProvider::add_profile(acc);
	}
}

// ── follow ─────────────────────────────────────────────────────────────

#[test]
fn follow_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert!(Follows::<Test>::contains_key(1, 2));
	});
}

#[test]
fn follow_transfers_fee_to_target() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		let free_1_before = Balances::free_balance(1);
		let free_2_before = Balances::free_balance(2);

		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));

		assert_eq!(Balances::free_balance(1), free_1_before - 10);
		assert_eq!(Balances::free_balance(2), free_2_before + 10);
	});
}

#[test]
fn follow_increments_counts() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2, 3]);

		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_eq!(FollowerCount::<Test>::get(2), 1);
		assert_eq!(FollowingCount::<Test>::get(1), 1);

		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(3), 2));
		assert_eq!(FollowerCount::<Test>::get(2), 2);
		assert_eq!(FollowingCount::<Test>::get(3), 1);
	});
}

#[test]
fn follow_emits_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		System::set_block_number(1);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		System::assert_last_event(crate::Event::Followed { follower: 1, followed: 2 }.into());
	});
}

#[test]
fn follow_records_block_number() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		System::set_block_number(77);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));

		let info = Follows::<Test>::get(1, 2).unwrap();
		assert_eq!(info.created_at, 77);
	});
}

#[test]
fn follow_fails_no_follower_profile() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[2]); // only target has profile
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn follow_fails_no_target_profile() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]); // only follower has profile
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn follow_fails_self_follow() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 1),
			Error::<Test>::CannotFollowSelf,
		);
	});
}

#[test]
fn follow_fails_already_following() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::AlreadyFollowing,
		);
	});
}

#[test]
fn follow_fails_insufficient_balance() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[4, 2]);
		// Account 4 has only 5, fee is 10.
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(4), 2),
			Error::<Test>::InsufficientBalance,
		);
	});
}

#[test]
fn follow_insufficient_balance_does_not_mutate_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[4, 2]);
		// CRITICAL fix test: if transfer fails, storage must not be modified.
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(4), 2),
			Error::<Test>::InsufficientBalance,
		);

		// No follow recorded, no counters changed.
		assert!(!Follows::<Test>::contains_key(4, 2));
		assert_eq!(FollowerCount::<Test>::get(2), 0);
		assert_eq!(FollowingCount::<Test>::get(4), 0);
	});
}

#[test]
fn follow_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(SocialGraph::follow(RuntimeOrigin::none(), 2), DispatchError::BadOrigin,);
	});
}

// ── unfollow ───────────────────────────────────────────────────────────

#[test]
fn unfollow_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert!(!Follows::<Test>::contains_key(1, 2));
	});
}

#[test]
fn unfollow_no_refund() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		let free_1_after_follow = Balances::free_balance(1);

		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		// Balance unchanged — no refund.
		assert_eq!(Balances::free_balance(1), free_1_after_follow);
	});
}

#[test]
fn unfollow_decrements_counts() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_eq!(FollowerCount::<Test>::get(2), 1);
		assert_eq!(FollowingCount::<Test>::get(1), 1);

		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert_eq!(FollowerCount::<Test>::get(2), 0);
		assert_eq!(FollowingCount::<Test>::get(1), 0);
	});
}

#[test]
fn unfollow_emits_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		System::set_block_number(1);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		System::assert_last_event(crate::Event::Unfollowed { follower: 1, followed: 2 }.into());
	});
}

#[test]
fn unfollow_fails_not_following() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialGraph::unfollow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::NotFollowing,
		);
	});
}

#[test]
fn unfollow_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(SocialGraph::unfollow(RuntimeOrigin::none(), 2), DispatchError::BadOrigin,);
	});
}

#[test]
fn unfollow_works_after_profile_deletion() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));

		// Simulate profile deletion — remove from mock provider.
		MockProfileProvider::remove_profile(1);

		// Unfollow should still work (no profile check on unfollow).
		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert!(!Follows::<Test>::contains_key(1, 2));
		assert_eq!(FollowerCount::<Test>::get(2), 0);
	});
}

// ── GraphProvider trait ────────────────────────────────────────────────

#[test]
fn graph_provider_is_following() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert!(!<SocialGraph as GraphProvider<u64>>::is_following(&1, &2));

		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert!(<SocialGraph as GraphProvider<u64>>::is_following(&1, &2));

		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert!(!<SocialGraph as GraphProvider<u64>>::is_following(&1, &2));
	});
}

#[test]
fn graph_provider_counts() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2, 3]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(3), 2));

		assert_eq!(<SocialGraph as GraphProvider<u64>>::follower_count(&2), 2);
		assert_eq!(<SocialGraph as GraphProvider<u64>>::following_count(&1), 1);
		assert_eq!(<SocialGraph as GraphProvider<u64>>::following_count(&3), 1);
	});
}

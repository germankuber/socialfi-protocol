use crate::{
	mock::*,
	pallet::{Error, FollowerCount, FollowingCount, Follows},
	GraphProvider,
};
use frame::{testing_prelude::*, traits::Currency};

fn setup_profiles(accounts: &[u64]) {
	for &acc in accounts {
		MockProfileProvider::add_profile(acc);
	}
}

// ── follow ─────────────────────────────────────────────────────────────

#[test]
fn follow_works_free() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		// No follow fee set = free
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert!(Follows::<Test>::contains_key(1, 2));
		// No balance change
		assert_eq!(Balances::free_balance(1), 1_000);
	});
}

#[test]
fn follow_transfers_per_profile_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		MockProfileProvider::set_follow_fee(2, 50);

		let free_1_before = Balances::free_balance(1);
		let free_2_before = Balances::free_balance(2);

		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));

		assert_eq!(Balances::free_balance(1), free_1_before - 50);
		assert_eq!(Balances::free_balance(2), free_2_before + 50);
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
	});
}

#[test]
fn follow_emits_event_with_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		MockProfileProvider::set_follow_fee(2, 25);
		System::set_block_number(1);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		System::assert_last_event(
			crate::Event::Followed { follower: 1, followed: 2, fee_paid: 25 }.into(),
		);
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
		setup_profiles(&[2]);
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn follow_fails_no_target_profile() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
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
		MockProfileProvider::set_follow_fee(2, 100);
		// Account 4 has only 5.
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(4), 2),
			Error::<Test>::InsufficientBalance,
		);
	});
}

#[test]
fn follow_fails_when_fee_leaves_caller_below_ed() {
	// Paying the full fee would leave the caller with 0, which violates
	// `KeepAlive` under the mock's `TestDefaultConfig` (ED = 1). The
	// extrinsic maps every transfer error to `InsufficientBalance`, so
	// this test pins that mapping: a user with balance EXACTLY equal to
	// the fee cannot follow, even though literal `balance < fee` is false.
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		MockProfileProvider::set_follow_fee(2, 100);
		// Caller has exactly `fee` — paying it would drop them below ED.
		Balances::make_free_balance_be(&1, 100);

		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(1), 2),
			Error::<Test>::InsufficientBalance,
		);
		// Storage untouched — same invariants as the literal-underfunded test.
		assert!(!Follows::<Test>::contains_key(1, 2));
		assert_eq!(FollowerCount::<Test>::get(2), 0);
	});
}

#[test]
fn follow_insufficient_balance_does_not_mutate_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[4, 2]);
		MockProfileProvider::set_follow_fee(2, 100);
		assert_noop!(
			SocialGraph::follow(RuntimeOrigin::signed(4), 2),
			Error::<Test>::InsufficientBalance,
		);
		assert!(!Follows::<Test>::contains_key(4, 2));
		assert_eq!(FollowerCount::<Test>::get(2), 0);
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
		MockProfileProvider::set_follow_fee(2, 50);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		let free_after = Balances::free_balance(1);
		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert_eq!(Balances::free_balance(1), free_after);
	});
}

#[test]
fn unfollow_decrements_counts() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
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
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		assert_noop!(SocialGraph::unfollow(RuntimeOrigin::none(), 2), DispatchError::BadOrigin,);
	});
}

#[test]
fn unfollow_works_after_profile_deletion() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialGraph::follow(RuntimeOrigin::signed(1), 2));
		MockProfileProvider::remove_profile(1);
		assert_ok!(SocialGraph::unfollow(RuntimeOrigin::signed(1), 2));
		assert!(!Follows::<Test>::contains_key(1, 2));
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
	});
}

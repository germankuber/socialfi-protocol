use crate::{
	mock::*,
	pallet::{Error, NextPostId, Posts, PostsByAuthor, Replies, UnlockedPosts},
	types::PostVisibility,
	PostProvider,
};
use frame::testing_prelude::*;

fn test_content() -> BoundedVec<u8, MaxContentLen> {
	BoundedVec::try_from(b"QmPostContent123".to_vec()).unwrap()
}

fn setup_profiles(accounts: &[u64]) {
	for &acc in accounts {
		MockProfileProvider::add_profile(acc);
	}
}

// ── create_post: public ────────────────────────────────────────────────

#[test]
fn create_post_public_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
		));
		let post = Posts::<Test>::get(0).expect("post should exist");
		assert_eq!(post.visibility, PostVisibility::Public);
		assert_eq!(post.unlock_fee, 0);
	});
}

#[test]
fn create_post_global_fee_goes_to_treasury() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		let treasury_before = Balances::free_balance(99);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
		));
		assert_eq!(Balances::free_balance(99), treasury_before + 10);
	});
}

#[test]
fn create_post_app_scoped_fee_goes_to_app_owner() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		let owner_before = Balances::free_balance(3);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			Some(10),
			0,
			PostVisibility::Public,
			0,
		));
		assert_eq!(Balances::free_balance(3), owner_before + 10);
	});
}

#[test]
fn create_post_increments_id() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert_eq!(NextPostId::<Test>::get(), 2);
	});
}

#[test]
fn create_post_populates_posts_by_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert_eq!(PostsByAuthor::<Test>::get(1).as_slice(), &[0, 1]);
	});
}

#[test]
fn create_post_fails_no_profile() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0
			),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn create_post_fails_invalid_app() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_noop!(
			SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				Some(999),
				0,
				PostVisibility::Public,
				0
			),
			Error::<Test>::AppNotFound,
		);
	});
}

// ── create_post: obfuscated / private ──────────────────────────────────

#[test]
fn create_post_obfuscated_stores_visibility_and_unlock_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			50,
		));
		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.visibility, PostVisibility::Obfuscated);
		assert_eq!(post.unlock_fee, 50);
	});
}

#[test]
fn create_post_private_stores_visibility() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Private,
			100,
		));
		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.visibility, PostVisibility::Private);
		assert_eq!(post.unlock_fee, 100);
	});
}

#[test]
fn create_post_public_ignores_unlock_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			999,
		));
		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.unlock_fee, 0); // forced to 0 for public
	});
}

// ── create_reply ───────────────────────────────────────────────────────

#[test]
fn create_reply_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None));
		let reply = Posts::<Test>::get(1).unwrap();
		assert_eq!(reply.parent_post, Some(0));
		assert_eq!(reply.visibility, PostVisibility::Public);
	});
}

#[test]
fn create_reply_pays_reply_fee_to_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			25,
			PostVisibility::Public,
			0
		));
		let author_before = Balances::free_balance(1);
		let replier_before = Balances::free_balance(2);
		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None));
		assert_eq!(Balances::free_balance(2), replier_before - 35); // 25 reply + 10 post fee
		assert_eq!(Balances::free_balance(1), author_before + 25);
	});
}

#[test]
fn create_reply_populates_replies_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		let rc = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, rc.clone(), None));
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, rc, None));
		assert_eq!(Replies::<Test>::get(0).as_slice(), &[1, 2]);
	});
}

#[test]
fn create_reply_fails_parent_not_found() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[2]);
		let rc = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 999, rc, None),
			Error::<Test>::ParentPostNotFound,
		);
	});
}

// ── unlock_post ────────────────────────────────────────────────────────

#[test]
fn unlock_obfuscated_post_transfers_fee_to_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			50,
		));
		let author_before = Balances::free_balance(1);
		let viewer_before = Balances::free_balance(2);

		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0));

		assert_eq!(Balances::free_balance(2), viewer_before - 50);
		assert_eq!(Balances::free_balance(1), author_before + 50);
		assert!(UnlockedPosts::<Test>::contains_key(2, 0));
	});
}

#[test]
fn unlock_private_post_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Private,
			100,
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0));
		assert!(UnlockedPosts::<Test>::contains_key(2, 0));
	});
}

#[test]
fn unlock_post_author_gets_free_access() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			50,
		));
		let balance_before = Balances::free_balance(1);
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 0));
		// Author pays nothing.
		assert_eq!(Balances::free_balance(1), balance_before);
		assert!(UnlockedPosts::<Test>::contains_key(1, 0));
	});
}

#[test]
fn unlock_post_fails_already_unlocked() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			50,
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0));
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0),
			Error::<Test>::AlreadyUnlocked,
		);
	});
}

#[test]
fn unlock_post_fails_public_post() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
		));
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0),
			Error::<Test>::PostIsPublic,
		);
	});
}

#[test]
fn unlock_post_fails_not_found() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 999),
			Error::<Test>::PostNotFound,
		);
	});
}

#[test]
fn unlock_post_fails_insufficient_balance() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 4]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Private,
			100,
		));
		// Account 4 has only 5.
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(4), 0),
			Error::<Test>::InsufficientBalance,
		);
	});
}

// ── PostProvider trait ──────────────────────────────────────────────────

#[test]
fn post_provider_exists() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert!(!<SocialFeeds as PostProvider<u64, u64>>::exists(&0));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert!(<SocialFeeds as PostProvider<u64, u64>>::exists(&0));
	});
}

#[test]
fn post_provider_get_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0
		));
		assert_eq!(<SocialFeeds as PostProvider<u64, u64>>::get_author(&0), Some(1));
	});
}

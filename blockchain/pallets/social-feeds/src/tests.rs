use crate::{
	mock::*,
	pallet::{Error, NextPostId, Posts, PostsByAuthor, Replies},
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

// ── create_post: global ────────────────────────────────────────────────

#[test]
fn create_post_global_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));

		let post = Posts::<Test>::get(0).expect("post should exist");
		assert_eq!(post.author, 1);
		assert_eq!(post.app_id, None);
		assert_eq!(post.parent_post, None);
		assert_eq!(post.reply_fee, 0);
	});
}

#[test]
fn create_post_global_fee_goes_to_treasury() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		let treasury_before = Balances::free_balance(99);
		let author_before = Balances::free_balance(1);

		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));

		assert_eq!(Balances::free_balance(99), treasury_before + 10);
		assert_eq!(Balances::free_balance(1), author_before - 10);
	});
}

#[test]
fn create_post_increments_id() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		assert_eq!(NextPostId::<Test>::get(), 2);
	});
}

#[test]
fn create_post_populates_posts_by_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));

		let posts = PostsByAuthor::<Test>::get(1);
		assert_eq!(posts.as_slice(), &[0, 1]);
	});
}

#[test]
fn create_post_emits_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		System::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		System::assert_last_event(
			crate::Event::PostCreated { post_id: 0, author: 1, app_id: None }.into(),
		);
	});
}

#[test]
fn create_post_records_block_number() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		System::set_block_number(42);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));

		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.created_at, 42);
	});
}

#[test]
fn create_post_stores_reply_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 50));

		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.reply_fee, 50);
	});
}

// ── create_post: app-scoped ────────────────────────────────────────────

#[test]
fn create_post_app_scoped_fee_goes_to_app_owner() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3); // app 10 owned by account 3

		let owner_before = Balances::free_balance(3);
		let author_before = Balances::free_balance(1);

		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), Some(10), 0));

		assert_eq!(Balances::free_balance(3), owner_before + 10);
		assert_eq!(Balances::free_balance(1), author_before - 10);

		let post = Posts::<Test>::get(0).unwrap();
		assert_eq!(post.app_id, Some(10));
	});
}

#[test]
fn create_post_emits_event_with_app_id() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		System::set_block_number(1);

		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), Some(10), 0));
		System::assert_last_event(
			crate::Event::PostCreated { post_id: 0, author: 1, app_id: Some(10) }.into(),
		);
	});
}

// ── create_post: failures ──────────────────────────────────────────────

#[test]
fn create_post_fails_no_profile() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn create_post_fails_invalid_app() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_noop!(
			SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), Some(999), 0),
			Error::<Test>::AppNotFound,
		);
	});
}

#[test]
fn create_post_fails_insufficient_balance() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[4]);
		// Account 4 has only 5, fee is 10.
		assert_noop!(
			SocialFeeds::create_post(RuntimeOrigin::signed(4), test_content(), None, 0),
			Error::<Test>::InsufficientBalance,
		);
	});
}

#[test]
fn create_post_insufficient_balance_does_not_mutate_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[4]);
		let next_before = NextPostId::<Test>::get();

		assert_noop!(
			SocialFeeds::create_post(RuntimeOrigin::signed(4), test_content(), None, 0),
			Error::<Test>::InsufficientBalance,
		);

		// Storage unchanged.
		assert_eq!(NextPostId::<Test>::get(), next_before);
		assert!(PostsByAuthor::<Test>::get(4).is_empty());
	});
}

#[test]
fn create_post_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::create_post(RuntimeOrigin::none(), test_content(), None, 0),
			DispatchError::BadOrigin,
		);
	});
}

// ── create_reply ───────────────────────────────────────────────────────

#[test]
fn create_reply_works() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));

		let reply_content = BoundedVec::try_from(b"QmReplyContent".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		let reply = Posts::<Test>::get(1).expect("reply should exist");
		assert_eq!(reply.author, 2);
		assert_eq!(reply.parent_post, Some(0));
		assert_eq!(reply.reply_fee, 0); // replies always have reply_fee = 0
	});
}

#[test]
fn create_reply_pays_reply_fee_to_parent_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		// Post with reply_fee of 25.
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 25,));

		let author_before = Balances::free_balance(1);
		let replier_before = Balances::free_balance(2);
		let treasury_before = Balances::free_balance(99);

		let reply_content = BoundedVec::try_from(b"QmReplyContent".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		// Replier pays: reply_fee (25) + post_fee (10) = 35 total
		assert_eq!(Balances::free_balance(2), replier_before - 35);
		// Author receives reply_fee.
		assert_eq!(Balances::free_balance(1), author_before + 25);
		// Treasury receives post_fee.
		assert_eq!(Balances::free_balance(99), treasury_before + 10);
	});
}

#[test]
fn create_reply_zero_reply_fee_no_transfer_to_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		// Post with reply_fee of 0.
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let author_before = Balances::free_balance(1);
		let replier_before = Balances::free_balance(2);

		let reply_content = BoundedVec::try_from(b"QmReplyContent".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		// Replier pays only post_fee (10).
		assert_eq!(Balances::free_balance(2), replier_before - 10);
		// Author gets nothing extra (already paid 10 post_fee earlier, so
		// their balance was author_initial - 10 = author_before).
		assert_eq!(Balances::free_balance(1), author_before);
	});
}

#[test]
fn create_reply_app_scoped_fee_goes_to_app_owner() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		MockAppProvider::add_app(10, 3);

		// Original post is global.
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let owner_before = Balances::free_balance(3);

		let reply_content = BoundedVec::try_from(b"QmReplyContent".to_vec()).unwrap();
		assert_ok!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, Some(10),)
		);

		// App owner gets the post fee.
		assert_eq!(Balances::free_balance(3), owner_before + 10);
	});
}

#[test]
fn create_reply_populates_replies_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(
			RuntimeOrigin::signed(2),
			0,
			reply_content.clone(),
			None,
		));
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		let replies = Replies::<Test>::get(0);
		assert_eq!(replies.as_slice(), &[1, 2]);
	});
}

#[test]
fn create_reply_populates_posts_by_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		let posts = PostsByAuthor::<Test>::get(2);
		assert_eq!(posts.as_slice(), &[1]);
	});
}

#[test]
fn create_reply_emits_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		System::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None,));

		System::assert_last_event(
			crate::Event::ReplyCreated { post_id: 1, parent_post_id: 0, author: 2, app_id: None }
				.into(),
		);
	});
}

// ── create_reply: failures ─────────────────────────────────────────────

#[test]
fn create_reply_fails_no_profile() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		// Account 2 has no profile.
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, None),
			Error::<Test>::ProfileNotFound,
		);
	});
}

#[test]
fn create_reply_fails_parent_not_found() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[2]);
		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 999, reply_content, None),
			Error::<Test>::ParentPostNotFound,
		);
	});
}

#[test]
fn create_reply_fails_invalid_app() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, reply_content, Some(999)),
			Error::<Test>::AppNotFound,
		);
	});
}

#[test]
fn create_reply_fails_insufficient_balance_for_post_fee() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 4]);
		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0,));

		let reply_content = BoundedVec::try_from(b"QmReply".to_vec()).unwrap();
		// Account 4 has only 5, post fee is 10.
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(4), 0, reply_content, None),
			Error::<Test>::InsufficientBalance,
		);
	});
}

#[test]
fn create_reply_unsigned_origin_rejected() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::create_reply(
				RuntimeOrigin::none(),
				0,
				BoundedVec::try_from(b"QmReply".to_vec()).unwrap(),
				None
			),
			DispatchError::BadOrigin,
		);
	});
}

// ── PostProvider trait ──────────────────────────────────────────────────

#[test]
fn post_provider_exists() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert!(!<SocialFeeds as PostProvider<u64, u64>>::exists(&0));

		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		assert!(<SocialFeeds as PostProvider<u64, u64>>::exists(&0));
	});
}

#[test]
fn post_provider_get_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_eq!(<SocialFeeds as PostProvider<u64, u64>>::get_author(&0), None);

		assert_ok!(SocialFeeds::create_post(RuntimeOrigin::signed(1), test_content(), None, 0));
		assert_eq!(<SocialFeeds as PostProvider<u64, u64>>::get_author(&0), Some(1));
	});
}

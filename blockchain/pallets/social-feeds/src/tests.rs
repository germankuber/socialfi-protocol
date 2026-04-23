use crate::{
	mock::*,
	pallet::{
		unsigned_error, Call, DeliverUnlockPayload, Error, KeyService, NextPostId, PendingUnlocks,
		Posts, PostsByAuthor, PostsTimeline, Replies, Unlocks,
	},
	types::{PostVisibility, SEALED_KEY_LEN},
	PostProvider,
};
use codec::Encode;
use frame::deps::frame_support::pallet_prelude::{
	InvalidTransaction, TransactionSource, ValidateUnsigned,
};
use frame::deps::frame_system;
use frame::deps::sp_runtime::testing::{TestSignature, UintAuthorityId};
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
			None,
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
			None,
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
			None,
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
			0,
			None,
		));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
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
			0,
			None,
		));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		assert_eq!(PostsByAuthor::<Test>::get(1).as_slice(), &[0, 1]);
	});
}

#[test]
fn create_post_insufficient_balance_does_not_mutate_storage() {
	// Account 4 has 5 units, PostFee is 10 — the transfer fails *after*
	// NextPostId / Posts / PostsByAuthor / PostsTimeline have already been
	// written. FRAME's transactional storage layer must roll them back; if
	// it does not, we leak a post id or end up with a half-built record.
	new_test_ext().execute_with(|| {
		setup_profiles(&[4]);
		let next_id_before = NextPostId::<Test>::get();

		assert_noop!(
			SocialFeeds::create_post(
				RuntimeOrigin::signed(4),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			),
			Error::<Test>::InsufficientBalance,
		);

		assert_eq!(NextPostId::<Test>::get(), next_id_before);
		assert!(Posts::<Test>::get(next_id_before).is_none());
		assert!(PostsByAuthor::<Test>::get(4).is_empty());
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
				0,
				None,
			),
			Error::<Test>::ProfileNotFound
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
				0,
				None,
			),
			Error::<Test>::AppNotFound
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
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
			None,
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
			0,
			None,
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
			0,
			None,
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
			0,
			None,
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		let author_before = Balances::free_balance(1);
		let viewer_before = Balances::free_balance(2);

		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]));

		assert_eq!(Balances::free_balance(2), viewer_before - 50);
		assert_eq!(Balances::free_balance(1), author_before + 50);
		assert!(Unlocks::<Test>::contains_key(0, 2));
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]));
		assert!(Unlocks::<Test>::contains_key(0, 2));
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		let balance_before = Balances::free_balance(1);
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 0, [1u8; 32]));
		// Author pays nothing and no storage is written.
		assert_eq!(Balances::free_balance(1), balance_before);
		assert!(!Unlocks::<Test>::contains_key(0, 1));
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]));
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]),
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
			None,
		));
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]),
			Error::<Test>::PostIsPublic,
		);
	});
}

#[test]
fn unlock_post_fails_not_found() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 999, [1u8; 32]),
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
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		// Account 4 has only 5.
		assert_noop!(
			SocialFeeds::unlock_post(RuntimeOrigin::signed(4), 0, [1u8; 32]),
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
			0,
			None,
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
			0,
			None,
		));
		assert_eq!(<SocialFeeds as PostProvider<u64, u64>>::get_author(&0), Some(1));
	});
}

// ── author self-unlock ─────────────────────────────────────────────────

#[test]
fn unlock_post_author_does_not_write_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			50,
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		// Author calls unlock on own post.
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 0, [1u8; 32]));
		// No entry in Unlocks — author has implicit access.
		assert!(!Unlocks::<Test>::contains_key(0, 1));
	});
}

// ── PostsTimeline index ────────────────────────────────────────────────
//
// Secondary index keyed by (author, (block, post_id)) that enables:
//   * Feed pagination in block-order without downloading the full
//     `PostsByAuthor` vec
//   * Range queries by block window (e.g. "last 7 days")
//   * Newest-first iteration via `iter_prefix` with reverse traversal
//
// Inserted on every `create_post` and `create_reply`. No deletion path
// yet — posts are immutable per the pallet's contract.

fn set_block(n: u64) {
	frame_system::Pallet::<Test>::set_block_number(n);
}

fn timeline_keys(author: u64) -> Vec<(u64, u64)> {
	PostsTimeline::<Test>::iter_key_prefix(&author).collect()
}

#[test]
fn timeline_populated_on_create_post() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		set_block(7);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		assert!(PostsTimeline::<Test>::contains_key(1, (7u64, 0u64)));
	});
}

#[test]
fn timeline_populated_on_create_reply() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		set_block(3);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		set_block(5);
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, test_content(), None,));
		assert!(PostsTimeline::<Test>::contains_key(2, (5u64, 1u64)));
	});
}

#[test]
fn timeline_isolated_per_author() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		set_block(10);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(2),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		let a1 = timeline_keys(1);
		let a2 = timeline_keys(2);
		assert_eq!(a1.len(), 1);
		assert_eq!(a2.len(), 1);
		assert_eq!(a1[0].1, 0);
		assert_eq!(a2[0].1, 1);
	});
}

#[test]
fn posts_timeline_returns_newest_first() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		set_block(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		set_block(4);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		set_block(9);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		let result = crate::Pallet::<Test>::posts_timeline(&1, None, None, 10);
		let ids: Vec<u64> = result.iter().map(|(_, id)| *id).collect();
		assert_eq!(ids, vec![2, 1, 0]);
	});
}

#[test]
fn posts_timeline_respects_limit() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		for block in 1..=5 {
			set_block(block);
			assert_ok!(SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			));
		}
		let result = crate::Pallet::<Test>::posts_timeline(&1, None, None, 2);
		assert_eq!(result.len(), 2);
		let ids: Vec<u64> = result.iter().map(|(_, id)| *id).collect();
		assert_eq!(ids, vec![4, 3]);
	});
}

#[test]
fn posts_timeline_filters_by_block_range() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		for block in [2u64, 5, 8, 12, 20] {
			set_block(block);
			assert_ok!(SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			));
		}
		// Window [5, 12] inclusive → posts at blocks 5, 8, 12.
		let result = crate::Pallet::<Test>::posts_timeline(&1, Some(5), Some(12), 10);
		let blocks: Vec<u64> = result.iter().map(|(b, _)| *b).collect();
		assert_eq!(blocks, vec![12, 8, 5]);
	});
}

// ── Boundary + event tests ─────────────────────────────────────────────

#[test]
fn create_post_fails_when_max_posts_reached() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		for _ in 0..MaxPostsPerAuthor::get() {
			assert_ok!(SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			));
		}
		assert_noop!(
			SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			),
			Error::<Test>::TooManyPosts
		);
	});
}

#[test]
fn create_reply_fails_when_max_replies_reached() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		for _ in 0..MaxRepliesPerPost::get() {
			assert_ok!(SocialFeeds::create_reply(
				RuntimeOrigin::signed(2),
				0,
				test_content(),
				None,
			));
		}
		assert_noop!(
			SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, test_content(), None,),
			Error::<Test>::TooManyReplies
		);
	});
}

#[test]
fn create_post_emits_event_with_all_fields() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::PostCreated {
				post_id: 0,
				author: 1,
				app_id: None,
				visibility: PostVisibility::Public,
				post_fee: 10,
				fee_recipient: 99,
			}
			.into(),
		);
	});
}

#[test]
fn create_reply_emits_event_with_all_fields() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			7,
			PostVisibility::Public,
			0,
			None,
		));
		assert_ok!(SocialFeeds::create_reply(RuntimeOrigin::signed(2), 0, test_content(), None,));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::ReplyCreated {
				post_id: 1,
				parent_post_id: 0,
				author: 2,
				parent_author: 1,
				app_id: None,
				reply_fee_paid: 7,
				post_fee_paid: 10,
				fee_recipient: 99,
			}
			.into(),
		);
	});
}

#[test]
fn set_key_service_first_write_has_version_one_and_no_previous() {
	new_test_ext().execute_with(|| {
		// `new_test_ext` pre-registers a key service — clear it so this
		// test exercises the first-write branch.
		KeyService::<Test>::kill();
		frame_system::Pallet::<Test>::set_block_number(1);

		assert_ok!(SocialFeeds::set_key_service(RuntimeOrigin::root(), 77u64, [1u8; 32]));

		let stored = KeyService::<Test>::get().expect("written");
		assert_eq!(stored.account, 77);
		assert_eq!(stored.version, 1);
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::KeyServiceUpdated { version: 1, account: 77, previous_account: None }
				.into(),
		);
	});
}

#[test]
fn set_key_service_rejects_zero_pk() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::set_key_service(RuntimeOrigin::root(), 77u64, [0u8; 32]),
			Error::<Test>::InvalidBuyerPk,
		);
	});
}

#[test]
fn set_key_service_rejects_non_admin_origin() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			SocialFeeds::set_key_service(RuntimeOrigin::signed(1), 77u64, [1u8; 32]),
			DispatchError::BadOrigin,
		);
	});
}

#[test]
fn set_key_service_emits_previous_account_on_rotation() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		// `new_test_ext` pre-registers account 42 as the initial key
		// service — rotating to 43 must surface 42 as previous_account.
		assert_ok!(SocialFeeds::set_key_service(RuntimeOrigin::root(), 43u64, [9u8; 32]));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::KeyServiceUpdated { version: 2, account: 43, previous_account: Some(42) }
				.into(),
		);
	});
}

#[test]
fn unlock_post_by_author_emits_acknowledgement_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Private,
			50,
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(1), 0, [1u8; 32]));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::AuthorSelfUnlockAcknowledged { post_id: 0, author: 1 }.into(),
		);
	});
}

#[test]
fn unlock_post_emits_event() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1, 2]);
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Obfuscated,
			25,
			Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
		));
		assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(2), 0, [1u8; 32]));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::PostUnlocked { post_id: 0, viewer: 2, author: 1, fee_paid: 25 }.into(),
		);
	});
}

// ── View Functions ─────────────────────────────────────────────────────
//
// `#[pallet::view_functions]` exposes typed read queries that off-chain
// clients call via the `RuntimeViewFunction` runtime API without paying
// fees or landing in a block. Under tests they are just regular methods
// on `Pallet<T>` — we invoke them directly. The goal is to verify the
// shape and content of the response; the RPC wiring is exercised by the
// runtime's `execute_view_function` in integration.

#[test]
fn view_post_by_id_returns_full_info() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		set_block(11);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		let info = crate::Pallet::<Test>::post_by_id(0).expect("post must exist");
		assert_eq!(info.author, 1);
		assert_eq!(info.visibility, PostVisibility::Public);
		assert_eq!(info.created_at, 11);
	});
}

#[test]
fn view_post_by_id_returns_none_for_missing() {
	new_test_ext().execute_with(|| {
		assert!(crate::Pallet::<Test>::post_by_id(999).is_none());
	});
}

#[test]
fn view_author_post_count_reflects_storage() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		assert_eq!(crate::Pallet::<Test>::author_post_count(1), 0);
		for _ in 0..3 {
			assert_ok!(SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			));
		}
		assert_eq!(crate::Pallet::<Test>::author_post_count(1), 3);
	});
}

#[test]
fn view_feed_by_author_hydrates_posts_newest_first() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		set_block(1);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		set_block(5);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));
		set_block(10);
		assert_ok!(SocialFeeds::create_post(
			RuntimeOrigin::signed(1),
			test_content(),
			None,
			0,
			PostVisibility::Public,
			0,
			None,
		));

		let feed = crate::Pallet::<Test>::feed_by_author(1, None, None, 10);
		// Full response — newest first: blocks 10, 5, 1 with ids 2, 1, 0.
		assert_eq!(feed.len(), 3);
		assert_eq!(feed[0].0, 2);
		assert_eq!(feed[0].1.created_at, 10);
		assert_eq!(feed[1].0, 1);
		assert_eq!(feed[1].1.created_at, 5);
		assert_eq!(feed[2].0, 0);
		assert_eq!(feed[2].1.created_at, 1);
	});
}

#[test]
fn view_feed_by_author_filters_and_limits() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		for block in [2u64, 7, 12, 20] {
			set_block(block);
			assert_ok!(SocialFeeds::create_post(
				RuntimeOrigin::signed(1),
				test_content(),
				None,
				0,
				PostVisibility::Public,
				0,
				None,
			));
		}
		// Range [5, 15] limit 1 → newest in window = block 12.
		let feed = crate::Pallet::<Test>::feed_by_author(1, Some(5), Some(15), 1);
		assert_eq!(feed.len(), 1);
		assert_eq!(feed[0].1.created_at, 12);
	});
}

#[test]
fn view_feed_by_author_empty_for_unknown() {
	new_test_ext().execute_with(|| {
		let feed = crate::Pallet::<Test>::feed_by_author(999, None, None, 10);
		assert!(feed.is_empty());
	});
}

// ── redact_post ────────────────────────────────────────────────────────

/// Create a public post owned by `author` inside `app_id`. Used by the
/// moderation tests to set up a redactable target with a known app id.
fn post_in_app(author: u64, app_id: u32) -> u64 {
	assert_ok!(SocialFeeds::create_post(
		RuntimeOrigin::signed(author),
		test_content(),
		Some(app_id),
		0,
		PostVisibility::Public,
		0,
		None,
	));
	// First post in a fresh ext — id starts at 0 — but we read it
	// explicitly so the helper keeps working if callers chain posts.
	NextPostId::<Test>::get().saturating_sub(1)
}

#[test]
fn redact_post_works_for_matching_app() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		let post_id = post_in_app(1, 10);

		// Arm the guard as (app_id=10, moderator=3) — matches the post's app.
		arm_moderation(10, 3);
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(SocialFeeds::redact_post(RuntimeOrigin::signed(3), post_id));

		let post = Posts::<Test>::get(post_id).unwrap();
		assert_eq!(post.redacted_by, Some(3));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::PostRedacted { post_id, app_id: 10, moderator: 3 }.into(),
		);
	});
}

#[test]
fn redact_post_fails_when_post_not_found() {
	new_test_ext().execute_with(|| {
		arm_moderation(10, 3);
		assert_noop!(
			SocialFeeds::redact_post(RuntimeOrigin::signed(3), 999),
			Error::<Test>::PostNotFound,
		);
	});
}

#[test]
fn redact_post_fails_when_post_not_in_app() {
	// Moderator of app 10 must NOT be able to redact a post in app 20 —
	// carrying `app_id` inside the origin is load-bearing precisely for
	// this case.
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		MockAppProvider::add_app(20, 4);
		let post_id = post_in_app(1, 20);

		arm_moderation(10, 3); // moderator of app 10, post belongs to app 20
		assert_noop!(
			SocialFeeds::redact_post(RuntimeOrigin::signed(3), post_id),
			Error::<Test>::PostNotInApp,
		);
	});
}

#[test]
fn redact_post_fails_when_already_redacted() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		let post_id = post_in_app(1, 10);

		arm_moderation(10, 3);
		assert_ok!(SocialFeeds::redact_post(RuntimeOrigin::signed(3), post_id));
		assert_noop!(
			SocialFeeds::redact_post(RuntimeOrigin::signed(3), post_id),
			Error::<Test>::AlreadyRedacted,
		);
	});
}

// ── deliver_unlock_unsigned + validate_unsigned ────────────────────────

/// Account id used by the mock's pre-registered key service (see
/// `new_test_ext`). The OCW authority used for signing must bridge
/// through `UintAuthorityId` to this account, otherwise
/// `validate_unsigned` rejects with `SIGNER_NOT_KEY_SERVICE`.
const KEY_SERVICE_ACCOUNT: u64 = 42;

fn wrapped_key_bytes() -> BoundedVec<u8, frame::traits::ConstU32<{ SEALED_KEY_LEN }>> {
	BoundedVec::try_from(vec![9u8; SEALED_KEY_LEN as usize]).unwrap()
}

fn make_payload(
	post_id: u64,
	viewer: u64,
	block_number: u64,
	signer: UintAuthorityId,
	wrapped_key: BoundedVec<u8, frame::traits::ConstU32<{ SEALED_KEY_LEN }>>,
) -> DeliverUnlockPayload<Test> {
	DeliverUnlockPayload { public: signer, block_number, post_id, viewer, wrapped_key }
}

fn sign_payload(payload: &DeliverUnlockPayload<Test>, signer: UintAuthorityId) -> TestSignature {
	// `UintAuthorityId::sign` would work here, but `TestSignature(id, msg)`
	// is just an equality check against the payload bytes — constructing it
	// directly keeps the test readable and avoids the optional return.
	TestSignature(u64::from(signer), payload.encode())
}

/// Set up an obfuscated post (id=0) and a pending unlock from `viewer`.
/// Returns the block number the unlock was issued at.
fn setup_pending_unlock(author: u64, viewer: u64) -> u64 {
	setup_profiles(&[author, viewer]);
	frame_system::Pallet::<Test>::set_block_number(10);
	assert_ok!(SocialFeeds::create_post(
		RuntimeOrigin::signed(author),
		test_content(),
		None,
		0,
		PostVisibility::Obfuscated,
		50,
		Some(BoundedVec::try_from(vec![1u8; 80]).unwrap()),
	));
	assert_ok!(SocialFeeds::unlock_post(RuntimeOrigin::signed(viewer), 0, [7u8; 32]));
	assert!(PendingUnlocks::<Test>::contains_key((0u64, viewer)));
	10
}

#[test]
fn deliver_unlock_unsigned_delivers_key_and_clears_pending() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);

		assert_ok!(
			SocialFeeds::deliver_unlock_unsigned(RuntimeOrigin::none(), payload, signature,)
		);

		let record = Unlocks::<Test>::get(0u64, 2).expect("unlock record");
		assert!(record.wrapped_key.is_some());
		assert!(!PendingUnlocks::<Test>::contains_key((0u64, 2)));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::UnlockKeyDelivered { post_id: 0, viewer: 2 }.into(),
		);
	});
}

#[test]
fn deliver_unlock_unsigned_fails_when_no_unlock_record() {
	new_test_ext().execute_with(|| {
		// No unlock_post was called — the record does not exist.
		frame_system::Pallet::<Test>::set_block_number(10);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, 10, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);

		assert_noop!(
			SocialFeeds::deliver_unlock_unsigned(RuntimeOrigin::none(), payload, signature),
			Error::<Test>::UnlockNotPending,
		);
	});
}

#[test]
fn deliver_unlock_unsigned_fails_on_redelivery() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer.clone());

		// First delivery succeeds.
		assert_ok!(SocialFeeds::deliver_unlock_unsigned(
			RuntimeOrigin::none(),
			payload.clone(),
			signature.clone(),
		));

		// Second delivery fails — wrapped_key is already set.
		assert_noop!(
			SocialFeeds::deliver_unlock_unsigned(RuntimeOrigin::none(), payload, signature),
			Error::<Test>::UnlockNotPending,
		);
	});
}

#[test]
fn validate_unsigned_rejects_external_source() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::External, &call);
		assert_eq!(result, Err(InvalidTransaction::Call.into()));
	});
}

#[test]
fn validate_unsigned_rejects_stale_payload() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		// Advance past the 16-block validity window.
		frame_system::Pallet::<Test>::set_block_number(block + 100);

		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call);
		assert_eq!(result, Err(InvalidTransaction::Custom(unsigned_error::STALE_PAYLOAD).into()));
	});
}

#[test]
fn validate_unsigned_rejects_future_payload() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		// Claim the payload was signed in a future block.
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block + 50, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call);
		assert_eq!(result, Err(InvalidTransaction::Custom(unsigned_error::STALE_PAYLOAD).into()));
	});
}

#[test]
fn validate_unsigned_rejects_when_key_service_unset() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		// Clear the key service so the guard kicks in.
		KeyService::<Test>::kill();

		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call);
		assert_eq!(
			result,
			Err(InvalidTransaction::Custom(unsigned_error::KEY_SERVICE_NOT_SET).into())
		);
	});
}

#[test]
fn validate_unsigned_rejects_wrong_signer() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		// Sign with an account that is NOT the registered key service.
		let attacker = UintAuthorityId(999);
		let payload = make_payload(0, 2, block, attacker.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, attacker);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call);
		assert_eq!(
			result,
			Err(InvalidTransaction::Custom(unsigned_error::SIGNER_NOT_KEY_SERVICE).into())
		);
	});
}

#[test]
fn validate_unsigned_rejects_bad_signature() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		// Signature does not match the payload bytes.
		let bad_signature = TestSignature(KEY_SERVICE_ACCOUNT, b"wrong-message".to_vec());
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature: bad_signature };

		let result = crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call);
		assert_eq!(result, Err(InvalidTransaction::BadProof.into()));
	});
}

#[test]
fn validate_unsigned_accepts_fresh_valid_payload() {
	new_test_ext().execute_with(|| {
		let block = setup_pending_unlock(1, 2);
		let signer = UintAuthorityId(KEY_SERVICE_ACCOUNT);
		let payload = make_payload(0, 2, block, signer.clone(), wrapped_key_bytes());
		let signature = sign_payload(&payload, signer);
		let call = Call::<Test>::deliver_unlock_unsigned { payload, signature };

		assert!(crate::Pallet::<Test>::validate_unsigned(TransactionSource::Local, &call).is_ok());
		// InBlock source is also allowed.
		assert!(crate::Pallet::<Test>::validate_unsigned(TransactionSource::InBlock, &call).is_ok());
	});
}

#[test]
fn redact_post_bad_origin_when_guard_disarmed() {
	new_test_ext().execute_with(|| {
		setup_profiles(&[1]);
		MockAppProvider::add_app(10, 3);
		let post_id = post_in_app(1, 10);

		// Guard defaults to disarmed → behaves like NeverModeration.
		disarm_moderation();
		assert_noop!(
			SocialFeeds::redact_post(RuntimeOrigin::signed(3), post_id),
			DispatchError::BadOrigin,
		);
	});
}

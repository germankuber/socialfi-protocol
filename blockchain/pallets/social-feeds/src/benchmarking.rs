//! Benchmarking setup for pallet-social-feeds

use super::*;
use frame::{deps::frame_benchmarking::v2::*, prelude::*};

#[benchmarks]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialFeeds;
	use crate::types::PostVisibility;
	use frame_system::RawOrigin;

	#[benchmark]
	fn create_post() {
		let caller: T::AccountId = whitelisted_caller();
		let fee = T::PostFee::get();
		let deposit = fee.saturating_mul(10u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);
		let content: BoundedVec<u8, T::MaxContentLen> =
			BoundedVec::try_from(b"QmPostContent123".to_vec()).unwrap();

		#[extrinsic_call]
		create_post(
			RawOrigin::Signed(caller.clone()),
			content,
			None,
			0u32.into(),
			PostVisibility::Public,
			0u32.into(),
		);

		assert!(Posts::<T>::contains_key(T::PostId::default()));
	}

	#[benchmark]
	fn create_reply() {
		let caller: T::AccountId = whitelisted_caller();
		let author: T::AccountId = account("author", 0, 0);
		let fee = T::PostFee::get();
		let deposit = fee.saturating_mul(10u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);
		T::Currency::make_free_balance_be(&author, deposit);

		let parent_id = T::PostId::default();
		let content: BoundedVec<u8, T::MaxContentLen> =
			BoundedVec::try_from(b"QmParentContent".to_vec()).unwrap();
		Posts::<T>::insert(
			parent_id,
			types::PostInfo {
				author: author.clone(),
				content: content.clone(),
				app_id: None,
				parent_post: None,
				reply_fee: 0u32.into(),
				visibility: PostVisibility::Public,
				unlock_fee: 0u32.into(),
				created_at: frame_system::Pallet::<T>::block_number(),
			},
		);
		let mut next = parent_id;
		next += T::PostId::from(1u64);
		NextPostId::<T>::put(next);

		let reply_content: BoundedVec<u8, T::MaxContentLen> =
			BoundedVec::try_from(b"QmReplyContent".to_vec()).unwrap();

		#[extrinsic_call]
		create_reply(RawOrigin::Signed(caller.clone()), parent_id, reply_content, None);

		assert!(Posts::<T>::contains_key(T::PostId::from(1u64)));
	}

	#[benchmark]
	fn unlock_post() {
		let caller: T::AccountId = whitelisted_caller();
		let author: T::AccountId = account("author", 0, 0);
		let deposit = T::PostFee::get().saturating_mul(10u32.into());
		T::Currency::make_free_balance_be(&caller, deposit);
		T::Currency::make_free_balance_be(&author, deposit);

		let post_id = T::PostId::default();
		let content: BoundedVec<u8, T::MaxContentLen> =
			BoundedVec::try_from(b"QmContent".to_vec()).unwrap();
		Posts::<T>::insert(
			post_id,
			types::PostInfo {
				author: author.clone(),
				content,
				app_id: None,
				parent_post: None,
				reply_fee: 0u32.into(),
				visibility: PostVisibility::Obfuscated,
				unlock_fee: 10u32.into(),
				created_at: frame_system::Pallet::<T>::block_number(),
			},
		);

		#[extrinsic_call]
		unlock_post(RawOrigin::Signed(caller.clone()), post_id);

		assert!(UnlockedPosts::<T>::contains_key(&caller, post_id));
	}

	impl_benchmark_test_suite!(SocialFeeds, crate::mock::new_test_ext(), crate::mock::Test);
}

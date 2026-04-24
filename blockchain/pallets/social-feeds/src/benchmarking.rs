//! Benchmarks for `pallet-social-feeds`.
//!
//! Every benchmark sets up the worst-case storage shape before the
//! measured call so the resulting weights cover the most expensive path
//! the dispatch can actually take. See `Config::BenchmarkHelper` for
//! the escape hatch we use to avoid dragging dependent pallets'
//! `create_profile` / `register_app` costs into these measurements.

#![cfg(feature = "runtime-benchmarks")]

use super::*;
use crate::{
	pallet::{BalanceOf, KeyService, NextPostId, PendingUnlocks, Posts, PostsByAuthor, Unlocks},
	types::{KeyServiceInfo, PostInfo, PostVisibility, SEALED_KEY_LEN, X25519_PK_LEN},
	BenchmarkHelper,
};
use frame::{
	deps::frame_benchmarking::v2::*,
	deps::frame_system::{self, RawOrigin},
	prelude::*,
	traits::Currency,
};
use scale_info::prelude::vec;

#[benchmarks(where BalanceOf<T>: From<u32>)]
mod benchmarks {
	use super::*;
	#[cfg(test)]
	use crate::pallet::Pallet as SocialFeeds;

	const SEED: u32 = 0;

	fn fund<T: Config>(who: &T::AccountId) {
		T::Currency::make_free_balance_be(who, <BalanceOf<T>>::from(u32::MAX));
	}

	fn install_key_service<T: Config>() {
		KeyService::<T>::put(KeyServiceInfo {
			account: account::<T::AccountId>("ks", 0, SEED),
			encryption_pk: [7u8; X25519_PK_LEN as usize],
			version: 1,
		});
	}

	fn max_content<T: Config>() -> BoundedVec<u8, T::MaxContentLen> {
		let n = T::MaxContentLen::get() as usize;
		BoundedVec::try_from(vec![b'x'; n]).expect("length == bound")
	}

	fn max_capsule() -> BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN }>> {
		BoundedVec::try_from(vec![1u8; SEALED_KEY_LEN as usize]).expect("SEALED_KEY_LEN bound")
	}

	/// Pre-fill `PostsByAuthor` so the next insert measures the
	/// worst-case BoundedVec push.
	fn fill_author_vec<T: Config>(author: &T::AccountId, n: u32) {
		if n == 0 {
			return;
		}
		let mut vec: BoundedVec<T::PostId, T::MaxPostsPerAuthor> = BoundedVec::default();
		for i in 0..n {
			vec.try_push(T::PostId::from(i as u64)).expect("n ≤ MaxPostsPerAuthor");
		}
		PostsByAuthor::<T>::insert(author, vec);
	}

	#[benchmark]
	fn create_post(
		n: Linear<0, { <T as pallet::Config>::MaxPostsPerAuthor::get() - 1 }>,
	) -> Result<(), BenchmarkError> {
		let caller: T::AccountId = whitelisted_caller();
		fund::<T>(&caller);
		T::BenchmarkHelper::register_profile(&caller);
		fill_author_vec::<T>(&caller, n);
		install_key_service::<T>();

		#[extrinsic_call]
		create_post(
			RawOrigin::Signed(caller.clone()),
			max_content::<T>(),
			None,
			<BalanceOf<T>>::from(0u32),
			PostVisibility::Obfuscated,
			<BalanceOf<T>>::from(100u32),
			Some(max_capsule()),
		);

		assert_eq!(PostsByAuthor::<T>::get(&caller).len() as u32, n + 1);
		Ok(())
	}

	#[benchmark]
	fn create_reply(
		n: Linear<0, { <T as pallet::Config>::MaxPostsPerAuthor::get() - 1 }>,
	) -> Result<(), BenchmarkError> {
		let caller: T::AccountId = whitelisted_caller();
		let author: T::AccountId = account("author", 0, SEED);
		fund::<T>(&caller);
		fund::<T>(&author);
		T::BenchmarkHelper::register_profile(&caller);
		T::BenchmarkHelper::register_profile(&author);

		let parent_id = T::PostId::default();
		Posts::<T>::insert(
			parent_id,
			PostInfo::<T> {
				author: author.clone(),
				content: max_content::<T>(),
				app_id: None,
				parent_post: None,
				reply_fee: <BalanceOf<T>>::from(0u32),
				visibility: PostVisibility::Public,
				unlock_fee: <BalanceOf<T>>::from(0u32),
				created_at: frame_system::Pallet::<T>::block_number(),
				redacted_by: None,
				capsule: None,
			},
		);
		let mut next = parent_id;
		next += T::PostId::from(1u64);
		NextPostId::<T>::put(next);

		fill_author_vec::<T>(&caller, n);

		#[extrinsic_call]
		create_reply(RawOrigin::Signed(caller.clone()), parent_id, max_content::<T>(), None);

		assert_eq!(PostsByAuthor::<T>::get(&caller).len() as u32, n + 1);
		Ok(())
	}

	#[benchmark]
	fn unlock_post() -> Result<(), BenchmarkError> {
		let caller: T::AccountId = whitelisted_caller();
		let author: T::AccountId = account("author", 0, SEED);
		fund::<T>(&caller);
		fund::<T>(&author);

		let post_id = T::PostId::default();
		Posts::<T>::insert(
			post_id,
			PostInfo::<T> {
				author: author.clone(),
				content: max_content::<T>(),
				app_id: None,
				parent_post: None,
				reply_fee: <BalanceOf<T>>::from(0u32),
				visibility: PostVisibility::Obfuscated,
				unlock_fee: <BalanceOf<T>>::from(100u32),
				created_at: frame_system::Pallet::<T>::block_number(),
				redacted_by: None,
				capsule: Some(max_capsule()),
			},
		);

		#[extrinsic_call]
		unlock_post(RawOrigin::Signed(caller.clone()), post_id, [1u8; X25519_PK_LEN as usize]);

		assert!(Unlocks::<T>::contains_key(post_id, &caller));
		assert!(PendingUnlocks::<T>::contains_key((post_id, caller.clone())));
		Ok(())
	}

	#[benchmark]
	fn set_key_service() -> Result<(), BenchmarkError> {
		// Seed a previous key service so the dispatch hits the rotation
		// branch (version + previous_account propagation) instead of
		// the first-write shortcut.
		install_key_service::<T>();
		let new_account: T::AccountId = account("ks2", 0, SEED);
		let origin =
			T::AdminOrigin::try_successful_origin().map_err(|_| BenchmarkError::Weightless)?;

		#[extrinsic_call]
		set_key_service(
			origin as T::RuntimeOrigin,
			new_account.clone(),
			[9u8; X25519_PK_LEN as usize],
		);

		let ks = KeyService::<T>::get().expect("written by extrinsic");
		assert_eq!(ks.account, new_account);
		assert_eq!(ks.version, 2);
		Ok(())
	}

	#[benchmark]
	fn redact_post() -> Result<(), BenchmarkError> {
		let author: T::AccountId = whitelisted_caller();
		fund::<T>(&author);
		T::BenchmarkHelper::register_profile(&author);

		let app_id = T::BenchmarkHelper::register_app(&author);

		let post_id = T::PostId::default();
		Posts::<T>::insert(
			post_id,
			PostInfo::<T> {
				author: author.clone(),
				content: max_content::<T>(),
				app_id: Some(app_id),
				parent_post: None,
				reply_fee: <BalanceOf<T>>::from(0u32),
				visibility: PostVisibility::Public,
				unlock_fee: <BalanceOf<T>>::from(0u32),
				created_at: frame_system::Pallet::<T>::block_number(),
				redacted_by: None,
				capsule: None,
			},
		);

		let origin =
			T::ModerationOrigin::try_successful_origin().map_err(|_| BenchmarkError::Weightless)?;

		#[extrinsic_call]
		redact_post(origin as T::RuntimeOrigin, post_id);

		let post = Posts::<T>::get(post_id).expect("post remains after redact");
		assert!(post.redacted_by.is_some());
		Ok(())
	}

	// `deliver_unlock_unsigned` is intentionally not benchmarked here.
	// Its body is a single `try_mutate` on `Unlocks` plus a `remove` on
	// `PendingUnlocks` (1 read + 2 writes). The heavy cost — signature
	// verification — lives in `validate_unsigned` and is billed by the
	// transaction pool, not by the dispatchable. The weight annotation
	// on the extrinsic reflects this shape; materializing an OCW
	// AppCrypto signature from a benchmark is infeasible without a
	// keystore, so we leave this path to end-to-end zombienet traces.

	impl_benchmark_test_suite!(SocialFeeds, crate::mock::new_test_ext(), crate::mock::Test,);
}

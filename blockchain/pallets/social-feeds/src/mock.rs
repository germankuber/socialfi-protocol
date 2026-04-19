use core::cell::RefCell;

use frame::{
	deps::{
		frame_support::{derive_impl, parameter_types, weights::constants::RocksDbWeight},
		frame_system::GenesisConfig,
		sp_runtime::BuildStorage,
	},
	prelude::*,
	runtime::prelude::*,
	testing_prelude::*,
};
use pallet_social_app_registry::AppProvider;
use pallet_social_profiles::ProfileProvider;
use polkadot_sdk::pallet_balances;

// ── Mock ProfileProvider ───────────────────────────────────────────────

pub struct MockProfileProvider;

thread_local! {
	static PROFILE_ACCOUNTS: RefCell<Vec<u64>> = RefCell::new(Vec::new());
}

impl MockProfileProvider {
	pub fn add_profile(account: u64) {
		PROFILE_ACCOUNTS.with(|v| {
			let mut v = v.borrow_mut();
			if !v.contains(&account) {
				v.push(account);
			}
		});
	}
}

impl ProfileProvider<u64, u64> for MockProfileProvider {
	fn exists(account: &u64) -> bool {
		PROFILE_ACCOUNTS.with(|v| v.borrow().contains(account))
	}

	fn follow_fee(_account: &u64) -> u64 {
		0
	}
}

// ── Mock AppProvider ───────────────────────────────────────────────────

pub struct MockAppProvider;

thread_local! {
	/// (app_id, owner_account_id)
	static APPS: RefCell<Vec<(u32, u64)>> = RefCell::new(Vec::new());
}

impl MockAppProvider {
	pub fn add_app(app_id: u32, owner: u64) {
		APPS.with(|v| {
			let mut v = v.borrow_mut();
			if !v.iter().any(|(id, _)| *id == app_id) {
				v.push((app_id, owner));
			}
		});
	}
}

impl AppProvider<u64, u32> for MockAppProvider {
	fn get_owner(app_id: &u32) -> Option<u64> {
		APPS.with(|v| v.borrow().iter().find(|(id, _)| id == app_id).map(|(_, o)| *o))
	}

	fn exists(app_id: &u32) -> bool {
		APPS.with(|v| v.borrow().iter().any(|(id, _)| id == app_id))
	}

	fn has_images(_app_id: &u32) -> bool {
		false
	}
}

// ── Runtime ────────────────────────────────────────────────────────────

#[frame_construct_runtime]
mod test_runtime {
	#[runtime::runtime]
	#[runtime::derive(
		RuntimeCall,
		RuntimeEvent,
		RuntimeError,
		RuntimeOrigin,
		RuntimeFreezeReason,
		RuntimeHoldReason,
		RuntimeSlashReason,
		RuntimeLockId,
		RuntimeTask,
		RuntimeViewFunction
	)]
	pub struct Test;

	#[runtime::pallet_index(0)]
	pub type System = frame_system;
	#[runtime::pallet_index(1)]
	pub type Balances = pallet_balances;
	#[runtime::pallet_index(2)]
	pub type SocialFeeds = crate;
}

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
	type Nonce = u64;
	type Block = MockBlock<Test>;
	type BlockHashCount = ConstU64<250>;
	type DbWeight = RocksDbWeight;
	type AccountData = pallet_balances::AccountData<u64>;
}

#[derive_impl(pallet_balances::config_preludes::TestDefaultConfig)]
impl pallet_balances::Config for Test {
	type AccountStore = System;
}

parameter_types! {
	pub const PostFee: u64 = 10;
	pub const MaxContentLen: u32 = 128;
	pub const MaxPostsPerAuthor: u32 = 100;
	pub const MaxRepliesPerPost: u32 = 100;
	pub TreasuryAccount: u64 = 99;
}

/// Stand-in origin guard for the moderation tests. `NeverModeration` always
/// rejects, which is fine for the existing test suite — none of the
/// existing tests exercise `redact_post`. A dedicated integration test
/// (e.g. in the runtime crate) would wire this to the real
/// `EnsureAppModerator` guard.
pub struct NeverModeration;
impl EnsureOrigin<RuntimeOrigin> for NeverModeration {
	type Success = (u32, u64);
	fn try_origin(o: RuntimeOrigin) -> Result<Self::Success, RuntimeOrigin> {
		Err(o)
	}
	#[cfg(feature = "runtime-benchmarks")]
	fn try_successful_origin() -> Result<RuntimeOrigin, ()> {
		Err(())
	}
}

impl crate::Config for Test {
	type PostId = u64;
	type AppId = u32;
	type Currency = Balances;
	type PostFee = PostFee;
	type TreasuryAccount = TreasuryAccount;
	type ProfileProvider = MockProfileProvider;
	type AppProvider = MockAppProvider;
	type MaxContentLen = MaxContentLen;
	type MaxPostsPerAuthor = MaxPostsPerAuthor;
	type MaxRepliesPerPost = MaxRepliesPerPost;
	type ModerationOrigin = NeverModeration;
	type WeightInfo = ();
}

/// Build genesis storage with pre-funded accounts for testing.
/// Account 99 is the treasury.
pub fn new_test_ext() -> TestState {
	PROFILE_ACCOUNTS.with(|v| v.borrow_mut().clear());
	APPS.with(|v| v.borrow_mut().clear());

	let mut storage = GenesisConfig::<Test>::default().build_storage().unwrap();

	pallet_balances::GenesisConfig::<Test> {
		balances: vec![
			(1, 10_000),  // author
			(2, 10_000),  // replier
			(3, 10_000),  // app owner
			(4, 5),       // poor account
			(99, 10_000), // treasury
		],
		dev_accounts: None,
	}
	.assimilate_storage(&mut storage)
	.unwrap();

	storage.into()
}

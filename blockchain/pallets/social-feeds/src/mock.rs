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
	// Small values so boundary tests can exercise the bounds without
	// creating thousands of posts. MaxPostsPerAuthor is larger than
	// MaxRepliesPerPost so the reply-limit test can saturate replies
	// from a single author without hitting the posts-per-author cap.
	pub const MaxPostsPerAuthor: u32 = 10;
	pub const MaxRepliesPerPost: u32 = 5;
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
	type AuthorityId = MockAuthorityId;
	type AdminOrigin = frame_system::EnsureRoot<u64>;
	type UnsignedValidityWindow = ConstU64<16>;
	type UnsignedPriority = ConstU64<1_000>;
	type WeightInfo = ();
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = TestBenchmarkHelper;
}

#[cfg(feature = "runtime-benchmarks")]
pub struct TestBenchmarkHelper;

#[cfg(feature = "runtime-benchmarks")]
impl crate::BenchmarkHelper<u64, u32> for TestBenchmarkHelper {
	fn register_profile(who: &u64) {
		MockProfileProvider::add_profile(*who);
	}
	fn register_app(owner: &u64) -> u32 {
		let next_id = APPS.with(|v| v.borrow().len() as u32);
		MockAppProvider::add_app(next_id, *owner);
		next_id
	}
}

/// Test-only AppCrypto wrapper. Bridges `UintAuthorityId` / `TestSignature`
/// to the `AppCrypto` trait expected by the pallet's Config; the concrete
/// keystore-based wrapper from `crate::crypto::AuthorityId` only works in a
/// real runtime with `MultiSignature`, so we substitute a simpler one here.
pub struct MockAuthorityId;
impl frame_system::offchain::AppCrypto<UintAuthorityId, TestSignature> for MockAuthorityId {
	type RuntimeAppPublic = UintAuthorityId;
	type GenericSignature = TestSignature;
	type GenericPublic = UintAuthorityId;
}

// Minimal OCW glue so the mock runtime satisfies the new Config bounds.
// The mock never actually submits unsigned txs, so `None` / bare-pass-through
// impls are sufficient. We use `TestSignature` / `UintAuthorityId` from
// `sp-runtime::testing` because they implement `IdentifyAccount<AccountId =
// u64>` out of the box and avoid dragging `AccountId32` into the mock.
use frame::deps::sp_runtime::{
	generic,
	testing::{TestSignature, UintAuthorityId},
};
use frame_system::offchain::{
	CreateBare as _CreateBare, CreateSignedTransaction, CreateTransactionBase, SigningTypes,
};

impl SigningTypes for Test {
	type Public = UintAuthorityId;
	type Signature = TestSignature;
}
impl<LocalCall> CreateTransactionBase<LocalCall> for Test
where
	RuntimeCall: From<LocalCall>,
{
	type Extrinsic = generic::UncheckedExtrinsic<u64, RuntimeCall, TestSignature, ()>;
	type RuntimeCall = RuntimeCall;
}
impl<LocalCall> _CreateBare<LocalCall> for Test
where
	RuntimeCall: From<LocalCall>,
{
	fn create_bare(
		call: RuntimeCall,
	) -> generic::UncheckedExtrinsic<u64, RuntimeCall, TestSignature, ()> {
		generic::UncheckedExtrinsic::new_bare(call)
	}
}
impl<LocalCall> CreateSignedTransaction<LocalCall> for Test
where
	RuntimeCall: From<LocalCall>,
{
	fn create_signed_transaction<
		C: frame_system::offchain::AppCrypto<Self::Public, Self::Signature>,
	>(
		_call: RuntimeCall,
		_public: UintAuthorityId,
		_account: u64,
		_nonce: u64,
	) -> Option<generic::UncheckedExtrinsic<u64, RuntimeCall, TestSignature, ()>> {
		None
	}
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

	let mut state: TestState = storage.into();
	// Register a dummy key service so tests that publish non-public posts
	// (with a capsule) pass the `KeyServiceNotConfigured` guard without
	// needing to stand up the admin flow in every test.
	state.execute_with(|| {
		crate::pallet::KeyService::<Test>::put(crate::types::KeyServiceInfo {
			account: 42u64,
			encryption_pk: [7u8; 32],
			version: 1,
		});
	});
	state
}

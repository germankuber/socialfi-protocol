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
use pallet_social_profiles::ProfileProvider;
use polkadot_sdk::pallet_balances;

/// Mock ProfileProvider backed by thread-local state.
pub struct MockProfileProvider;

thread_local! {
	static PROFILE_ACCOUNTS: RefCell<Vec<u64>> = RefCell::new(Vec::new());
	static FOLLOW_FEES: RefCell<Vec<(u64, u64)>> = RefCell::new(Vec::new());
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

	pub fn remove_profile(account: u64) {
		PROFILE_ACCOUNTS.with(|v| {
			v.borrow_mut().retain(|a| *a != account);
		});
	}

	pub fn set_follow_fee(account: u64, fee: u64) {
		FOLLOW_FEES.with(|v| {
			let mut v = v.borrow_mut();
			v.retain(|(a, _)| *a != account);
			v.push((account, fee));
		});
	}
}

impl ProfileProvider<u64, u64> for MockProfileProvider {
	fn exists(account: &u64) -> bool {
		PROFILE_ACCOUNTS.with(|v| v.borrow().contains(account))
	}

	fn follow_fee(account: &u64) -> u64 {
		FOLLOW_FEES.with(|v| {
			v.borrow().iter().find(|(a, _)| a == account).map(|(_, f)| *f).unwrap_or(0)
		})
	}
}

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
	pub type SocialGraph = crate;
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

impl crate::Config for Test {
	type Currency = Balances;
	type ProfileProvider = MockProfileProvider;
	type WeightInfo = ();
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = TestBenchmarkHelper;
}

#[cfg(feature = "runtime-benchmarks")]
pub struct TestBenchmarkHelper;

#[cfg(feature = "runtime-benchmarks")]
impl crate::BenchmarkHelper<u64> for TestBenchmarkHelper {
	fn register_profile(who: &u64) {
		MockProfileProvider::add_profile(*who);
	}
}

/// Build genesis storage with pre-funded accounts for testing.
pub fn new_test_ext() -> TestState {
	PROFILE_ACCOUNTS.with(|v| v.borrow_mut().clear());
	FOLLOW_FEES.with(|v| v.borrow_mut().clear());

	let mut storage = GenesisConfig::<Test>::default().build_storage().unwrap();

	pallet_balances::GenesisConfig::<Test> {
		balances: vec![(1, 1_000), (2, 1_000), (3, 1_000), (4, 5)],
		dev_accounts: None,
	}
	.assimilate_storage(&mut storage)
	.unwrap();

	storage.into()
}

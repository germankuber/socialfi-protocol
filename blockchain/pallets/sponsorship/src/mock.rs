//! Test runtime for `pallet-sponsorship`. Wires the pallet alongside
//! `pallet-balances` — the tests exercise pot top-up, withdraw, and
//! settlement accounting, so real balance transfers must happen.

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
use polkadot_sdk::pallet_balances;

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
	pub type Sponsorship = crate;
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
	pub const MinimumPotBalance: u64 = 10;
}

impl crate::Config for Test {
	type Currency = Balances;
	type MinimumPotBalance = MinimumPotBalance;
}

pub const SPONSOR: u64 = 1;
pub const BENEFICIARY: u64 = 2;
pub const OTHER: u64 = 3;

pub fn new_test_ext() -> TestState {
	let mut storage = GenesisConfig::<Test>::default().build_storage().unwrap();

	pallet_balances::GenesisConfig::<Test> {
		balances: vec![(SPONSOR, 10_000), (BENEFICIARY, 10_000), (OTHER, 10_000)],
		dev_accounts: None,
	}
	.assimilate_storage(&mut storage)
	.unwrap();

	storage.into()
}

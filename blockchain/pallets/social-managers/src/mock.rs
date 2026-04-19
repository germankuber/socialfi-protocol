//! Test runtime for `pallet-social-managers`.
//!
//! The mock wires the pallet under test alongside `pallet-balances` (for the
//! deposit behaviour) and two miniature stand-ins for `pallet-social-feeds`
//! and `pallet-social-profiles`. The stand-ins exist only so the test-runtime
//! `RuntimeCall` enum carries the exact pallet names (`SocialFeeds`,
//! `SocialProfiles`) and function names (`create_post`, `set_follow_fee`)
//! that `required_scope` dispatches on.

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

/// Dummy pallet that stands in for `pallet-social-feeds`. Its sole job is to
/// contribute a `create_post` call to the runtime's `RuntimeCall` enum and to
/// record the caller so tests can verify the synthesized origin carried the
/// correct account.
#[frame::pallet]
pub mod dummy_feeds {
	use frame::prelude::*;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config<RuntimeEvent: From<Event<Self>>> {}

	#[pallet::storage]
	pub type LastAuthor<T: Config> = StorageValue<_, T::AccountId, OptionQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		PostCreated { author: T::AccountId },
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn create_post(origin: OriginFor<T>) -> DispatchResult {
			let who = ensure_signed(origin)?;
			LastAuthor::<T>::put(who.clone());
			Self::deposit_event(Event::PostCreated { author: who });
			Ok(())
		}
	}
}

/// Dummy pallet that stands in for `pallet-social-profiles`, providing the
/// `set_follow_fee` call that exercises the `UpdateProfile` scope routing.
#[frame::pallet]
pub mod dummy_profiles {
	use frame::prelude::*;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config<RuntimeEvent: From<Event<Self>>> {}

	#[pallet::storage]
	pub type LastCaller<T: Config> = StorageValue<_, T::AccountId, OptionQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		FollowFeeUpdated { who: T::AccountId },
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		#[pallet::call_index(0)]
		#[pallet::weight(Weight::from_parts(10_000, 0))]
		pub fn set_follow_fee(origin: OriginFor<T>) -> DispatchResult {
			let who = ensure_signed(origin)?;
			LastCaller::<T>::put(who.clone());
			Self::deposit_event(Event::FollowFeeUpdated { who });
			Ok(())
		}
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

	// Name is load-bearing: `required_scope` keys on the metadata string.
	#[runtime::pallet_index(2)]
	pub type SocialFeeds = crate::mock::dummy_feeds;

	#[runtime::pallet_index(3)]
	pub type SocialProfiles = crate::mock::dummy_profiles;

	#[runtime::pallet_index(10)]
	pub type SocialManagers = crate;
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

impl dummy_feeds::Config for Test {}
impl dummy_profiles::Config for Test {}

parameter_types! {
	pub const ManagerDepositBase: u64 = 10;
	pub const MaxManagersPerOwner: u32 = 4;
	pub const MaxExpiryPurgePerBlock: u32 = 8;
}

impl crate::Config for Test {
	type Currency = Balances;
	type ManagerDepositBase = ManagerDepositBase;
	type MaxManagersPerOwner = MaxManagersPerOwner;
	type MaxExpiryPurgePerBlock = MaxExpiryPurgePerBlock;
	type WeightInfo = ();
}

/// Well-known accounts used across the test suite.
pub const ALICE: u64 = 1;
pub const BOB: u64 = 2;
pub const CAROL: u64 = 3;

/// Genesis with pre-funded balances comfortably above
/// `ManagerDepositBase * MaxManagersPerOwner`.
pub fn new_test_ext() -> TestState {
	let mut storage = GenesisConfig::<Test>::default().build_storage().unwrap();

	pallet_balances::GenesisConfig::<Test> {
		balances: vec![(ALICE, 1_000), (BOB, 1_000), (CAROL, 1_000)],
		dev_accounts: None,
	}
	.assimilate_storage(&mut storage)
	.unwrap();

	storage.into()
}

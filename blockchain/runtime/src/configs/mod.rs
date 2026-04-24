mod xcm_config;

use polkadot_sdk::{staging_xcm as xcm, *};

use cumulus_pallet_parachain_system::RelayNumberMonotonicallyIncreases;
use cumulus_primitives_core::{AggregateMessageOrigin, ParaId};
use frame_support::{
	derive_impl,
	dispatch::DispatchClass,
	parameter_types,
	traits::{
		ConstBool, ConstU32, ConstU64, ConstU8, EitherOfDiverse, TransformOrigin, VariantCountOf,
	},
	weights::{ConstantMultiplier, Weight},
	PalletId,
};
use frame_system::{
	limits::{BlockLength, BlockWeights},
	EnsureRoot,
};
use pallet_xcm::{EnsureXcm, IsVoiceOfBody};
use parachains_common::message_queue::{NarrowOriginToSibling, ParaIdToSibling};
use polkadot_runtime_common::{
	xcm_sender::NoPriceForMessageDelivery, BlockHashCount, SlowAdjustingFeeUpdate,
};
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_runtime::Perbill;
use sp_version::RuntimeVersion;
use xcm::latest::prelude::BodyId;

use super::{
	weights::{BlockExecutionWeight, ExtrinsicBaseWeight, RocksDbWeight},
	AccountId, Aura, Balance, Balances, Block, BlockNumber, CollatorSelection, ConsensusHook, Hash,
	MessageQueue, Nonce, PalletInfo, ParachainSystem, Runtime, RuntimeCall, RuntimeEvent,
	RuntimeFreezeReason, RuntimeHoldReason, RuntimeOrigin, RuntimeTask, Session, SessionKeys,
	SocialAppRegistry, SocialProfiles, System, XcmpQueue, AVERAGE_ON_INITIALIZE_RATIO,
	EXISTENTIAL_DEPOSIT, HOURS, MAXIMUM_BLOCK_WEIGHT, MICRO_UNIT, NORMAL_DISPATCH_RATIO,
	SLOT_DURATION, VERSION,
};
use xcm_config::{RelayLocation, XcmOriginToTransactDispatchOrigin};

parameter_types! {
	pub const Version: RuntimeVersion = VERSION;
	pub RuntimeBlockLength: BlockLength =
		BlockLength::max_with_normal_ratio(5 * 1024 * 1024, NORMAL_DISPATCH_RATIO);
	pub RuntimeBlockWeights: BlockWeights = BlockWeights::builder()
		.base_block(BlockExecutionWeight::get())
		.for_class(DispatchClass::all(), |weights| {
			weights.base_extrinsic = ExtrinsicBaseWeight::get();
		})
		.for_class(DispatchClass::Normal, |weights| {
			weights.max_total = Some(NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT);
		})
		.for_class(DispatchClass::Operational, |weights| {
			weights.max_total = Some(MAXIMUM_BLOCK_WEIGHT);
			weights.reserved = Some(
				MAXIMUM_BLOCK_WEIGHT - NORMAL_DISPATCH_RATIO * MAXIMUM_BLOCK_WEIGHT
			);
		})
		.avg_block_initialization(AVERAGE_ON_INITIALIZE_RATIO)
		.build_or_panic();
	pub const SS58Prefix: u16 = 42;
}

#[derive_impl(frame_system::config_preludes::ParaChainDefaultConfig)]
impl frame_system::Config for Runtime {
	type AccountId = AccountId;
	type Nonce = Nonce;
	type Hash = Hash;
	type Block = Block;
	type BlockHashCount = BlockHashCount;
	type Version = Version;
	type AccountData = pallet_balances::AccountData<Balance>;
	type DbWeight = RocksDbWeight;
	type BlockWeights = RuntimeBlockWeights;
	type BlockLength = RuntimeBlockLength;
	type SS58Prefix = SS58Prefix;
	type OnSetCode = cumulus_pallet_parachain_system::ParachainSetCode<Self>;
	type MaxConsumers = frame_support::traits::ConstU32<16>;
}

impl cumulus_pallet_weight_reclaim::Config for Runtime {
	type WeightInfo = ();
}

impl pallet_timestamp::Config for Runtime {
	type Moment = u64;
	type OnTimestampSet = Aura;
	type MinimumPeriod = ConstU64<0>;
	type WeightInfo = ();
}

impl pallet_authorship::Config for Runtime {
	type FindAuthor = pallet_session::FindAccountFromAuthorIndex<Self, Aura>;
	type EventHandler = (CollatorSelection,);
}

parameter_types! {
	pub const ExistentialDeposit: Balance = EXISTENTIAL_DEPOSIT;
}

impl pallet_balances::Config for Runtime {
	type MaxLocks = ConstU32<50>;
	type Balance = Balance;
	type RuntimeEvent = RuntimeEvent;
	type DustRemoval = ();
	type ExistentialDeposit = ExistentialDeposit;
	type AccountStore = System;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Runtime>;
	type MaxReserves = ConstU32<50>;
	type ReserveIdentifier = [u8; 8];
	type RuntimeHoldReason = RuntimeHoldReason;
	type RuntimeFreezeReason = RuntimeFreezeReason;
	type FreezeIdentifier = RuntimeFreezeReason;
	type MaxFreezes = VariantCountOf<RuntimeFreezeReason>;
	type DoneSlashHandler = ();
}

parameter_types! {
	pub const TransactionByteFee: Balance = 10 * MICRO_UNIT;
}

impl pallet_transaction_payment::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type OnChargeTransaction = pallet_transaction_payment::FungibleAdapter<Balances, ()>;
	// Standard polynomial-based fee curve declared in the runtime crate.
	type WeightToFee = super::WeightToFee;
	type LengthToFee = ConstantMultiplier<Balance, TransactionByteFee>;
	type FeeMultiplierUpdate = SlowAdjustingFeeUpdate<Self>;
	type OperationalFeeMultiplier = ConstU8<5>;
	type WeightInfo = ();
}

impl pallet_sudo::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
	type WeightInfo = ();
}

parameter_types! {
	pub const ReservedXcmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
	pub const ReservedDmpWeight: Weight = MAXIMUM_BLOCK_WEIGHT.saturating_div(4);
	pub const RelayOrigin: AggregateMessageOrigin = AggregateMessageOrigin::Parent;
}

impl cumulus_pallet_parachain_system::Config for Runtime {
	type WeightInfo = ();
	type RuntimeEvent = RuntimeEvent;
	type OnSystemEvent = ();
	type SelfParaId = staging_parachain_info::Pallet<Runtime>;
	type OutboundXcmpMessageSource = XcmpQueue;
	type DmpQueue = frame_support::traits::EnqueueWithOrigin<MessageQueue, RelayOrigin>;
	type ReservedDmpWeight = ReservedDmpWeight;
	type XcmpMessageHandler = XcmpQueue;
	type ReservedXcmpWeight = ReservedXcmpWeight;
	type CheckAssociatedRelayNumber = RelayNumberMonotonicallyIncreases;
	type ConsensusHook = ConsensusHook;
	type RelayParentOffset = ConstU32<0>;
}

impl staging_parachain_info::Config for Runtime {}

parameter_types! {
	pub MessageQueueServiceWeight: Weight = Perbill::from_percent(35) * RuntimeBlockWeights::get().max_block;
}

impl pallet_message_queue::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = ();
	#[cfg(feature = "runtime-benchmarks")]
	type MessageProcessor = pallet_message_queue::mock_helpers::NoopMessageProcessor<
		cumulus_primitives_core::AggregateMessageOrigin,
	>;
	#[cfg(not(feature = "runtime-benchmarks"))]
	type MessageProcessor = staging_xcm_builder::ProcessXcmMessage<
		AggregateMessageOrigin,
		staging_xcm_executor::XcmExecutor<xcm_config::XcmConfig>,
		RuntimeCall,
	>;
	type Size = u32;
	type QueueChangeHandler = NarrowOriginToSibling<XcmpQueue>;
	type QueuePausedQuery = NarrowOriginToSibling<XcmpQueue>;
	type HeapSize = sp_core::ConstU32<{ 103 * 1024 }>;
	type MaxStale = sp_core::ConstU32<8>;
	type ServiceWeight = MessageQueueServiceWeight;
	type IdleMaxServiceWeight = ();
}

impl cumulus_pallet_aura_ext::Config for Runtime {}

impl cumulus_pallet_xcmp_queue::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type ChannelInfo = ParachainSystem;
	type VersionWrapper = ();
	type XcmpQueue = TransformOrigin<MessageQueue, AggregateMessageOrigin, ParaId, ParaIdToSibling>;
	type MaxInboundSuspended = sp_core::ConstU32<1_000>;
	type MaxActiveOutboundChannels = ConstU32<128>;
	type MaxPageSize = ConstU32<{ 1 << 16 }>;
	type ControllerOrigin = EnsureRoot<AccountId>;
	type ControllerOriginConverter = XcmOriginToTransactDispatchOrigin;
	type WeightInfo = ();
	type PriceForSiblingDelivery = NoPriceForMessageDelivery<ParaId>;
}

parameter_types! {
	/// Session rotation period — sessions last 6 hours worth of blocks.
	pub const Period: u32 = 6 * HOURS;
	pub const Offset: u32 = 0;
}

impl pallet_session::Config for Runtime {
	type Currency = Balances;
	type KeyDeposit = ();
	type RuntimeEvent = RuntimeEvent;
	type ValidatorId = <Self as frame_system::Config>::AccountId;
	type ValidatorIdOf = pallet_collator_selection::IdentityCollator;
	type ShouldEndSession = pallet_session::PeriodicSessions<Period, Offset>;
	type NextSessionRotation = pallet_session::PeriodicSessions<Period, Offset>;
	type SessionManager = CollatorSelection;
	type SessionHandler = <SessionKeys as sp_runtime::traits::OpaqueKeys>::KeyTypeIdProviders;
	type Keys = SessionKeys;
	type DisablingStrategy = ();
	type WeightInfo = ();
}

impl pallet_aura::Config for Runtime {
	type AuthorityId = AuraId;
	type DisabledValidators = ();
	type MaxAuthorities = ConstU32<100_000>;
	type AllowMultipleBlocksPerSlot = ConstBool<true>;
	type SlotDuration = ConstU64<SLOT_DURATION>;
}

parameter_types! {
	pub const PotId: PalletId = PalletId(*b"PotStake");
	/// Session length for collator-selection kick threshold evaluation.
	pub const SessionLength: BlockNumber = 6 * HOURS;
	pub const StakingAdminBodyId: BodyId = BodyId::Defense;
}

pub type CollatorSelectionUpdateOrigin = EitherOfDiverse<
	EnsureRoot<AccountId>,
	EnsureXcm<IsVoiceOfBody<RelayLocation, StakingAdminBodyId>>,
>;

impl pallet_collator_selection::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type UpdateOrigin = CollatorSelectionUpdateOrigin;
	type PotId = PotId;
	type MaxCandidates = ConstU32<100>;
	type MinEligibleCollators = ConstU32<4>;
	type MaxInvulnerables = ConstU32<20>;
	type KickThreshold = Period;
	type ValidatorId = <Self as frame_system::Config>::AccountId;
	type ValidatorIdOf = pallet_collator_selection::IdentityCollator;
	type ValidatorRegistration = Session;
	type WeightInfo = ();
}

// Statement Store cost parameters.
// StatementCost: flat fee per statement (10x existential deposit).
// StatementByteCost: per-byte fee (existential deposit / 1024).
// Min/MaxAllowedStatements: per-account statement count limits.
// Min/MaxAllowedBytes: per-account total byte limits (1 MiB to 16 MiB).
parameter_types! {
	pub const StatementCost: Balance = 10 * EXISTENTIAL_DEPOSIT;
	pub const StatementByteCost: Balance = EXISTENTIAL_DEPOSIT / 1024;
	pub const MinAllowedStatements: u32 = 1;
	pub const MaxAllowedStatements: u32 = 16;
	pub const MinAllowedBytes: u32 = 1024 * 1024;
	pub const MaxAllowedBytes: u32 = 16 * 1024 * 1024;
}

impl pallet_statement::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type StatementCost = StatementCost;
	type ByteCost = StatementByteCost;
	type MinAllowedStatements = MinAllowedStatements;
	type MaxAllowedStatements = MaxAllowedStatements;
	type MinAllowedBytes = MinAllowedBytes;
	type MaxAllowedBytes = MaxAllowedBytes;
}

parameter_types! {
	pub const AppBond: Balance = 10 * EXISTENTIAL_DEPOSIT;
	pub const MaxMetadataLen: u32 = 128;
	/// Hard cap on apps a single account can register. Chosen deliberately
	/// low (5) because the owner-index `AppsByOwner` stores every id as a
	/// `BoundedVec`; each `register_app` / `deregister_app` rewrites the
	/// whole vec, so PoV scales linearly with this constant.
	pub const MaxAppsPerOwner: u32 = 5;
}

/// Configure the social app registry pallet.
/// Adapter that plugs the SocialFi pallets into `pallet-statement` so
/// reply / follow / new-app events turn into live Statement Store
/// notifications. Clients subscribed via `statement_subscribeStatement`
/// get the update pushed immediately — no block polling, no indexer.
pub struct NotificationStatementSubmitter;

impl social_notifications_primitives::StatementSubmitter<AccountId>
	for NotificationStatementSubmitter
{
	fn submit_statement(account: AccountId, statement: sp_statement_store::Statement) {
		pallet_statement::Pallet::<Runtime>::submit_statement(account, statement);
	}
}

impl pallet_social_app_registry::Config for Runtime {
	type AppId = u32;
	type Currency = Balances;
	type AppBond = AppBond;
	type MaxMetadataLen = MaxMetadataLen;
	type MaxAppsPerOwner = MaxAppsPerOwner;
	type WeightInfo = pallet_social_app_registry::weights::SubstrateWeight<Runtime>;
	type NotificationSubmitter = NotificationStatementSubmitter;
}

parameter_types! {
	pub const ProfileBond: Balance = 10 * EXISTENTIAL_DEPOSIT;
	pub const MaxProfileMetadataLen: u32 = 128;
}

/// Configure the social profiles pallet.
impl pallet_social_profiles::Config for Runtime {
	type Currency = Balances;
	type ProfileBond = ProfileBond;
	type MaxMetadataLen = MaxProfileMetadataLen;
	type WeightInfo = pallet_social_profiles::weights::SubstrateWeight<Runtime>;
}

/// Configure the social graph pallet.
/// Follow fee is per-profile (set via pallet-social-profiles::set_follow_fee).
impl pallet_social_graph::Config for Runtime {
	type Currency = Balances;
	type ProfileProvider = SocialProfiles;
	type WeightInfo = pallet_social_graph::weights::SubstrateWeight<Runtime>;
	type NotificationSubmitter = NotificationStatementSubmitter;
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = GraphBenchmarkHelper;
}

#[cfg(feature = "runtime-benchmarks")]
pub struct GraphBenchmarkHelper;

#[cfg(feature = "runtime-benchmarks")]
impl pallet_social_graph::BenchmarkHelper<AccountId> for GraphBenchmarkHelper {
	fn register_profile(who: &AccountId) {
		// Mirror `FeedsBenchmarkHelper::register_profile` — direct
		// storage insert so benchmarks do not pay the cost of the
		// social-profiles `create_profile` dispatch on every iteration.
		use frame_support::BoundedVec;
		use pallet_social_profiles::types::ProfileInfo;
		let info: ProfileInfo<Runtime> = ProfileInfo {
			metadata: BoundedVec::default(),
			follow_fee: 0,
			created_at: frame_system::Pallet::<Runtime>::block_number(),
		};
		pallet_social_profiles::Profiles::<Runtime>::insert(who, info);
	}
}

parameter_types! {
	pub const PostFee: Balance = EXISTENTIAL_DEPOSIT;
	pub const MaxContentLen: u32 = 128;
	pub const MaxPostsPerAuthor: u32 = 10_000;
	pub const MaxRepliesPerPost: u32 = 10_000;
	/// Treasury sink for post fees on global (app-less) posts. Production
	/// runtimes should point this at a governance-controlled account via a
	/// runtime upgrade; `[0xff; 32]` is an unclaimable stub so fees are
	/// effectively burned in dev.
	pub FeedsTreasuryAccount: AccountId = sp_runtime::AccountId32::new([0xffu8; 32]);
}

parameter_types! {
	pub const FeedsUnsignedValidityWindow: BlockNumber = 16;
	pub const FeedsUnsignedPriority: sp_runtime::transaction_validity::TransactionPriority =
		sp_runtime::transaction_validity::TransactionPriority::MAX / 2;
}

/// Configure the social feeds pallet.
impl pallet_social_feeds::Config for Runtime {
	type PostId = u64;
	type AppId = u32;
	type Currency = Balances;
	type PostFee = PostFee;
	type TreasuryAccount = FeedsTreasuryAccount;
	type ProfileProvider = SocialProfiles;
	type AppProvider = SocialAppRegistry;
	type MaxContentLen = MaxContentLen;
	type MaxPostsPerAuthor = MaxPostsPerAuthor;
	type MaxRepliesPerPost = MaxRepliesPerPost;
	/// `redact_post` is callable only through the `AppModerator` origin
	/// emitted by `pallet-social-app-registry::act_as_moderator`. That
	/// custom origin carries `(app_id, moderator)` and cannot be produced
	/// by a raw Signed call, so the moderation privilege is enforced at
	/// the type level.
	type ModerationOrigin = pallet_social_app_registry::EnsureAppModerator<Runtime>;
	/// Key service + delivery authority for encrypted posts.
	type AuthorityId = pallet_social_feeds::crypto::AuthorityId;
	type AdminOrigin = EnsureRoot<AccountId>;
	type UnsignedValidityWindow = FeedsUnsignedValidityWindow;
	type UnsignedPriority = FeedsUnsignedPriority;
	type WeightInfo = pallet_social_feeds::weights::SubstrateWeight<Runtime>;
	type NotificationSubmitter = NotificationStatementSubmitter;
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = FeedsBenchmarkHelper;
}

#[cfg(feature = "runtime-benchmarks")]
pub struct FeedsBenchmarkHelper;

#[cfg(feature = "runtime-benchmarks")]
impl pallet_social_feeds::BenchmarkHelper<AccountId, u32> for FeedsBenchmarkHelper {
	fn register_profile(who: &AccountId) {
		use frame_support::BoundedVec;
		use pallet_social_profiles::types::ProfileInfo;
		// Direct storage insert. Going through `create_profile` would
		// reserve a bond on every benchmark invocation and inflate the
		// measured weights with pallet-social-profiles' costs.
		let info: ProfileInfo<Runtime> = ProfileInfo {
			metadata: BoundedVec::default(),
			follow_fee: 0,
			created_at: frame_system::Pallet::<Runtime>::block_number(),
		};
		pallet_social_profiles::Profiles::<Runtime>::insert(who, info);
	}
	fn register_app(owner: &AccountId) -> u32 {
		use frame_support::BoundedVec;
		use pallet_social_app_registry::types::{AppInfo, AppStatus};
		let app_id = pallet_social_app_registry::NextAppId::<Runtime>::get();
		let next = app_id.saturating_add(1);
		pallet_social_app_registry::NextAppId::<Runtime>::put(next);
		pallet_social_app_registry::Apps::<Runtime>::insert(
			app_id,
			AppInfo::<Runtime> {
				owner: owner.clone(),
				metadata: BoundedVec::default(),
				has_images: false,
				created_at: frame_system::Pallet::<Runtime>::block_number(),
				status: AppStatus::Active,
			},
		);
		app_id
	}
}

// ── pallet-social-managers (scoped delegation) ─────────────────────────

parameter_types! {
	/// Per-manager deposit reserved on the owner. Set to zero here so the
	/// hackathon demo is friction-free; raise to something like
	/// `EXISTENTIAL_DEPOSIT` on a public testnet to stop state-bloat grief.
	pub const ManagerDepositBase: Balance = 0;
	/// Cap on active delegations per owner. Chosen to cover realistic
	/// multi-device/multi-bot setups (web, mobile, backup, scheduler, …)
	/// without letting any single owner inflate `MaxExpiryPurgePerBlock`.
	pub const MaxManagersPerOwner: u32 = 8;
	/// Upper bound on expired entries swept by `on_idle` per block. Keeps
	/// lazy reclamation predictable and prevents hook starvation.
	pub const MaxExpiryPurgePerBlock: u32 = 16;
	/// Upper bound on entries the `on_idle` hook may *scan* per block while
	/// hunting for expired ones. Chosen as 8× the purge budget: a big pool
	/// of still-valid managers cannot force the hook into an unbounded
	/// read loop, because it will stop at `MaxExpiryScanPerBlock` reads
	/// regardless of how many expirables are still hiding further in.
	pub const MaxExpiryScanPerBlock: u32 = 128;
}

impl pallet_social_managers::Config for Runtime {
	type Currency = Balances;
	type ManagerDepositBase = ManagerDepositBase;
	type MaxManagersPerOwner = MaxManagersPerOwner;
	type MaxExpiryPurgePerBlock = MaxExpiryPurgePerBlock;
	type MaxExpiryScanPerBlock = MaxExpiryScanPerBlock;
	type WeightInfo = pallet_social_managers::weights::SubstrateWeight<Runtime>;
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = ManagersBenchmarkHelper;
}

#[cfg(feature = "runtime-benchmarks")]
pub struct ManagersBenchmarkHelper;

#[cfg(feature = "runtime-benchmarks")]
impl pallet_social_managers::BenchmarkHelper<Runtime> for ManagersBenchmarkHelper {
	fn scoped_call() -> RuntimeCall {
		// `required_scope` (social-managers/src/lib.rs) accepts
		// `SocialProfiles::set_follow_fee` under `ManagerScope::UpdateProfile`.
		// Using it sidesteps the `ProfileProvider::exists` gate that
		// `SocialFeeds::create_post` would otherwise impose on the
		// benchmark caller.
		RuntimeCall::SocialProfiles(pallet_social_profiles::Call::set_follow_fee { fee: 0 })
	}
	fn scope_for_scoped_call() -> pallet_social_managers::types::ScopeMask {
		pallet_social_managers::types::ScopeMask::from_scopes(&[
			pallet_social_managers::types::ManagerScope::UpdateProfile,
		])
	}
}

// ── pallet-sponsorship (gasless tx via a community pot) ────────────────

parameter_types! {
	/// Sponsors whose pot balance drops below this threshold are ignored
	/// by the ChargeSponsored extension. Guards against tiny leftover pots
	/// that would cover one transaction then leave the beneficiary stuck
	/// mid-flow when the pot depletes.
	pub const SponsorMinimumPotBalance: Balance = EXISTENTIAL_DEPOSIT;
}

impl pallet_sponsorship::Config for Runtime {
	type Currency = Balances;
	type MinimumPotBalance = SponsorMinimumPotBalance;
	type WeightInfo = pallet_sponsorship::weights::SubstrateWeight<Runtime>;
}

// ── OCW glue for pallet-social-feeds encrypted posts ───────────────────
//
// Provides the trait family the offchain worker needs to build+submit
// unsigned-with-signed-payload transactions from runtime code.
// In stable2512 `SendTransactionTypes` was renamed `CreateTransactionBase`.

use frame_system::offchain::{
	CreateBare, CreateSignedTransaction, CreateTransactionBase, SigningTypes,
};
use sp_runtime::MultiSignature;

impl SigningTypes for Runtime {
	type Public = <MultiSignature as sp_runtime::traits::Verify>::Signer;
	type Signature = MultiSignature;
}

impl<LocalCall> CreateTransactionBase<LocalCall> for Runtime
where
	RuntimeCall: From<LocalCall>,
{
	type Extrinsic = super::UncheckedExtrinsic;
	type RuntimeCall = RuntimeCall;
}

impl<LocalCall> CreateBare<LocalCall> for Runtime
where
	RuntimeCall: From<LocalCall>,
{
	fn create_bare(call: RuntimeCall) -> super::UncheckedExtrinsic {
		use sp_runtime::generic;
		generic::UncheckedExtrinsic::new_bare(call).into()
	}
}

impl<LocalCall> CreateSignedTransaction<LocalCall> for Runtime
where
	RuntimeCall: From<LocalCall>,
{
	fn create_signed_transaction<
		C: frame_system::offchain::AppCrypto<Self::Public, Self::Signature>,
	>(
		_call: RuntimeCall,
		_public: <MultiSignature as sp_runtime::traits::Verify>::Signer,
		_account: AccountId,
		_nonce: Nonce,
	) -> Option<super::UncheckedExtrinsic> {
		// We only submit unsigned-with-signed-payload from the OCW; the
		// signed path is never used, so a stub `None` is enough.
		None
	}
}

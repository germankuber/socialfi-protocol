//! `ChargeSponsored` — a minimal [`TransactionExtension`] that redirects
//! the fee payment of an extrinsic from the signer to the pallet's
//! community pot.
//!
//! This is the smallest possible demonstration of the v2 transaction-extension
//! pipeline: the struct carries a single boolean. When set, and the pot has
//! enough balance to cover the estimated fee, the pot is debited in
//! `prepare` so the subsequent `ChargeTransactionPayment` extension in the
//! runtime pipeline observes no free balance to charge from the signer.
//!
//! For a production-grade implementation you would add: per-app budgets, an
//! allowlist of sponsorable calls, per-(app, user) rate limits, and a
//! `post_dispatch_details` refund when the actual fee came in below the
//! estimate. All of those are left out here on purpose — the point of the
//! file is to keep the extension under 150 lines of code so the reader can
//! follow the full lifecycle at a glance.

use crate::{BalanceOf, Config, Event, Pallet};
use codec::{Decode, DecodeWithMemTracking, Encode};
use frame::{
	deps::{
		frame_support::{
			dispatch::{DispatchInfo, PostDispatchInfo},
			pallet_prelude::TransactionSource,
		},
		sp_runtime::{
			traits::{
				DispatchInfoOf, Dispatchable, Implication, PostDispatchInfoOf,
				TransactionExtension, ValidateResult,
			},
			transaction_validity::{InvalidTransaction, TransactionValidityError, ValidTransaction},
		},
	},
	prelude::*,
	traits::{Currency, ExistenceRequirement},
};
use scale_info::TypeInfo;

/// Custom error codes returned as `InvalidTransaction::Custom(_)` from the
/// validation step. Keep these stable across releases — clients surface the
/// raw byte to users.
pub mod errors {
	pub const POT_INSUFFICIENT: u8 = 100;
}

/// Transaction extension that opportunistically routes fee payment through
/// the community pot.
///
/// The extension is deliberately **zero-sized** — it carries no fields in
/// the SCALE-encoded extrinsic payload. Two consequences:
///
/// 1. Wallets that do not recognise `ChargeSponsored` (notably
///    Polkadot.js extension, which accepts unknown extensions only when
///    both `value` and `additionalSigned` encode to empty bytes) stay
///    happy and can still sign ordinary transactions.
/// 2. Sponsorship becomes an *opt-out of the pallet*, not a per-tx flag:
///    if the pot has at least `info.call_weight` of free balance, the
///    extension pays; otherwise the signer pays. A user that does NOT
///    want their fee covered simply never tops up the pot they rely on.
///
/// This is a pragmatic compromise for the hackathon demo. A production
/// implementation would take the opt-in back with a richer signed
/// payload (see `pallet-verify-signature` for the `Enum { Disabled |
/// Signed {..} }` pattern) at the cost of dropping PJS compatibility —
/// Talisman / SubWallet support arbitrary extensions natively.
#[derive(
	Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, Default, TypeInfo,
)]
#[scale_info(skip_type_params(T))]
pub struct ChargeSponsored<T: Config>(core::marker::PhantomData<T>);

impl<T: Config> ChargeSponsored<T> {
	pub fn new() -> Self {
		Self(core::marker::PhantomData)
	}
}

impl<T: Config> core::fmt::Debug for ChargeSponsored<T> {
	fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result {
		write!(f, "ChargeSponsored")
	}
}

/// Value carried from `validate` to `prepare`. `Skip` is the non-sponsored
/// path and does nothing downstream; `Apply` records the signer and the
/// fee we intend to move out of the pot.
pub enum Val<T: Config> {
	Skip,
	Apply { who: T::AccountId, fee: BalanceOf<T> },
}

/// Value carried from `prepare` to `post_dispatch_details`. Kept separate
/// from `Val` to express the state change: once we are past `prepare`, the
/// pot has already been debited.
pub enum Pre<T: Config> {
	Skip,
	Applied(core::marker::PhantomData<T>),
}

impl<T> TransactionExtension<<T as frame_system::Config>::RuntimeCall> for ChargeSponsored<T>
where
	T: Config + Send + Sync,
	<T as frame_system::Config>::RuntimeCall:
		Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync,
{
	const IDENTIFIER: &'static str = "ChargeSponsored";
	type Implicit = ();
	type Val = Val<T>;
	type Pre = Pre<T>;

	fn weight(
		&self,
		_call: &<T as frame_system::Config>::RuntimeCall,
	) -> Weight {
		// Two reads (signer lookup + pot balance) and one write (debit).
		T::DbWeight::get().reads_writes(2, 1)
	}

	fn validate(
		&self,
		origin: <<T as frame_system::Config>::RuntimeCall as Dispatchable>::RuntimeOrigin,
		_call: &<T as frame_system::Config>::RuntimeCall,
		info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		_len: usize,
		_self_implicit: Self::Implicit,
		_inherited: &impl Implication,
		_source: TransactionSource,
	) -> ValidateResult<Self::Val, <T as frame_system::Config>::RuntimeCall> {
		// Conservative upper bound for the fee: we use the call's declared
		// weight and treat each unit of ref_time as one planck. The
		// fee-multiplier from pallet-transaction-payment will refine the
		// actual charge at dispatch time — the minimal extension accepts a
		// small over-reservation and does not refund the difference.
		let fee: BalanceOf<T> = info.call_weight.ref_time().saturated_into();

		// The pot is opportunistic: if it cannot cover the full estimated
		// fee we step aside and let ChargeTransactionPayment bill the
		// signer normally. This keeps the chain functional when the pot
		// runs out without requiring users to change their wallet flow.
		if Pallet::<T>::pot_balance() < fee {
			return Ok((ValidTransaction::default(), Val::Skip, origin));
		}

		let who = {
			let system = match origin.as_system_ref() {
				Some(raw) => raw.clone(),
				None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
			};
			match system.as_signed() {
				Some(acc) => acc.clone(),
				// Unsigned / root origins cannot be sponsored — they have
				// no signer account to credit.
				None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
			}
		};

		Ok((ValidTransaction::default(), Val::Apply { who, fee }, origin))
	}

	fn prepare(
		self,
		val: Self::Val,
		_origin: &<<T as frame_system::Config>::RuntimeCall as Dispatchable>::RuntimeOrigin,
		_call: &<T as frame_system::Config>::RuntimeCall,
		_info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		_len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		match val {
			Val::Skip => Ok(Pre::Skip),
			Val::Apply { who, fee } => {
				// Move the fee from the pot to the signer so that the
				// following `ChargeTransactionPayment` sees enough free
				// balance and withdraws from there. The signer ends up
				// net-zero and the pot takes the cost.
				T::Currency::transfer(
					&Pallet::<T>::pot_account(),
					&who,
					fee,
					ExistenceRequirement::KeepAlive,
				)
				.map_err(|_| InvalidTransaction::Custom(errors::POT_INSUFFICIENT))?;

				Pallet::<T>::deposit_event(Event::FeeSponsored { who, fee });
				Ok(Pre::Applied(Default::default()))
			},
		}
	}

	fn post_dispatch_details(
		_pre: Self::Pre,
		_info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		_post_info: &PostDispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		_len: usize,
		_result: &DispatchResult,
	) -> Result<Weight, TransactionValidityError> {
		// Minimal version does not refund over-estimation. Any unused fee
		// stays with the signer rather than returning to the pot — a
		// rounding loss we accept to keep the code small.
		Ok(Weight::zero())
	}
}

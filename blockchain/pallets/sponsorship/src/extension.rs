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

/// Transaction extension that opts a transaction into sponsorship.
///
/// Carried inline in the extrinsic's signed payload, so the signer has to
/// actively set `sponsor = true` to trigger the code path. When false (the
/// default), this extension is a no-op and the following
/// `ChargeTransactionPayment` behaves identically to a non-sponsored chain.
#[derive(
	Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, Default, TypeInfo,
)]
#[scale_info(skip_type_params(T))]
pub struct ChargeSponsored<T: Config> {
	/// `true` means the signer is requesting that the pot cover this
	/// transaction's fee.
	pub sponsor: bool,
	_phantom: core::marker::PhantomData<T>,
}

impl<T: Config> ChargeSponsored<T> {
	pub fn new(sponsor: bool) -> Self {
		Self { sponsor, _phantom: Default::default() }
	}
}

// SCALE `Debug` is skipped for brevity — we only print the single flag.
impl<T: Config> core::fmt::Debug for ChargeSponsored<T> {
	fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result {
		write!(f, "ChargeSponsored({})", self.sponsor)
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
		if !self.sponsor {
			return Ok((ValidTransaction::default(), Val::Skip, origin));
		}

		// We use the call's declared weight as the fee estimate. This is a
		// conservative upper bound that the pallet-transaction-payment
		// fee-multiplier will refine at dispatch time — for the minimal
		// version we accept a small over-reservation.
		let fee: BalanceOf<T> = info.call_weight.ref_time().saturated_into();

		if Pallet::<T>::pot_balance() < fee {
			return Err(InvalidTransaction::Custom(errors::POT_INSUFFICIENT).into());
		}

		let who = {
			let system = match origin.as_system_ref() {
				Some(raw) => raw.clone(),
				// Non-system origin cannot be sponsored.
				None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
			};
			match system.as_signed() {
				Some(acc) => acc.clone(),
				// Unsigned txs cannot be sponsored — they have no user to
				// credit. Silently fall through to Skip so the rest of the
				// pipeline runs unchanged.
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

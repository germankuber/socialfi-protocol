//! `ChargeSponsored` — transaction extension that redirects fee payment
//! from the signer to a sponsor the signer is registered under.
//!
//! The extension intentionally carries **zero bytes** in the signed
//! payload. The opt-in lives entirely in on-chain state (`SponsorOf`), so
//! the signer's wallet never needs to know about this extension — any
//! PJS-compatible wallet (Talisman, SubWallet, Polkadot.js) signs the
//! transaction like any other.
//!
//! Lifecycle per transaction:
//!
//! 1. `validate` — cheap read of `SponsorOf[signer]` and `SponsorPots`.
//!    Returns `Val::Skip` when the signer has no sponsor or the pot is
//!    under-funded, and the regular `ChargeTransactionPayment`
//!    extension bills the signer as usual.
//! 2. `prepare` — when `Val::Apply` was set, debit the sponsor's pot and
//!    deposit the fee into the beneficiary's free balance. Emits
//!    `FeeSponsored { sponsor, beneficiary, fee }`. The next extension
//!    in the pipeline then withdraws the same amount from the
//!    beneficiary, netting their balance to zero.
//! 3. `post_dispatch_details` — no refund path in the MVP; any
//!    over-estimation stays with the beneficiary.

use crate::{BalanceOf, Config, Pallet};
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
			transaction_validity::{
				InvalidTransaction, TransactionValidityError, ValidTransaction,
			},
		},
	},
	prelude::*,
};
use scale_info::TypeInfo;

/// Zero-sized extension. See the module docs for why.
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

/// Intermediate value passed from `validate` to `prepare`.
pub enum Val<T: Config> {
	/// No applicable sponsor — the native charge extension handles the fee.
	Skip,
	/// A sponsor was resolved; `prepare` will settle on their pot.
	Apply { sponsor: T::AccountId, beneficiary: T::AccountId, fee: BalanceOf<T> },
}

/// Result of `prepare`. Tagged so a future `post_dispatch_details` can
/// distinguish a sponsored tx from a native one for refund logic.
pub enum Pre<T: Config> {
	Skipped,
	Settled(core::marker::PhantomData<T>),
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
		// Two reads (SponsorOf + SponsorPots) on the skip path, plus one
		// write (SponsorPots) + one currency transfer on the apply path.
		// We charge for the apply path always; the skip path just
		// over-reserves a small amount that the fee multiplier amortises.
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
		let beneficiary = match origin.as_system_ref() {
			Some(raw) => match raw.clone().as_signed() {
				Some(acc) => acc.clone(),
				// Unsigned / root origins cannot be sponsored.
				None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
			},
			None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
		};

		// Conservative upper bound on the fee: ref_time of the call, 1
		// planck per unit. The actual fee is settled by the native
		// ChargeTransactionPayment extension that runs next — it is free
		// to compute a different number; we pay the upper bound anyway
		// and accept the over-reservation as a hackathon simplification.
		let fee: BalanceOf<T> = info.call_weight.ref_time().saturated_into();

		let sponsor = match Pallet::<T>::resolve_sponsor(&beneficiary, fee) {
			Some(s) => s,
			// No sponsor or insufficient pot: fall through to native.
			None => return Ok((ValidTransaction::default(), Val::Skip, origin)),
		};

		Ok((
			ValidTransaction::default(),
			Val::Apply { sponsor, beneficiary, fee },
			origin,
		))
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
			Val::Skip => Ok(Pre::Skipped),
			Val::Apply { sponsor, beneficiary, fee } => {
				Pallet::<T>::settle_sponsorship(&sponsor, &beneficiary, fee)
					.map_err(|_| InvalidTransaction::Payment)?;
				Ok(Pre::Settled(core::marker::PhantomData))
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
		// Over-estimation stays with the beneficiary in the MVP. A
		// production version would recompute the actual fee here and
		// refund the delta to the sponsor's pot.
		Ok(Weight::zero())
	}
}

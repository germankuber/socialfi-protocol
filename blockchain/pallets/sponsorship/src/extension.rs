//! `ChargeSponsored` — wrapper transaction extension that transparently
//! redirects fee payment from the signer to their registered sponsor.
//!
//! ## Why a wrapper, not a standalone extension
//!
//! A standalone extension that modifies balances before
//! `ChargeTransactionPayment` runs has two hard problems:
//!
//! 1. The native `ChargeTransactionPayment.validate` calls
//!    `can_withdraw_fee` on the signer. A beneficiary with balance `0`
//!    (e.g. a freshly onboarded user) fails that check in the pool, so
//!    the sponsorship never gets a chance to kick in.
//! 2. Any extension that carries non-zero SCALE bytes in its signed
//!    payload breaks `@polkadot-api/pjs-signer`, which only understands
//!    a fixed whitelist of canonical signed extensions.
//!
//! The canonical fix in polkadot-sdk is the `SkipCheckIfFeeless`
//! pattern (`substrate/frame/transaction-payment/skip-feeless-payment`).
//! We replicate it here: wrap `ChargeTransactionPayment` in a generic
//! `ChargeSponsored<T, S>` that forwards every piece of metadata to the
//! inner extension `S`, so from the outside the tx looks exactly like a
//! plain native-fee tx. Inside the wrapper, `validate` checks `SponsorOf`
//! *first*:
//!
//! - If there is a sponsor with a funded pot, skip `S` entirely — we
//!   settle the fee against the pot in `prepare` and never touch the
//!   signer's balance.
//! - Otherwise, delegate to `S` exactly as if the wrapper was not there.
//!
//! The extension therefore remains PJS-compatible (it inherits `S`'s
//! identifier) *and* supports beneficiaries with balance zero.

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
			transaction_validity::{InvalidTransaction, TransactionValidityError},
		},
	},
	prelude::*,
};
use scale_info::{StaticTypeInfo, TypeInfo};

/// Wrapper extension. `S` is the inner extension we forward to when no
/// sponsorship applies — typically `ChargeTransactionPayment`.
#[derive(Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq)]
pub struct ChargeSponsored<T, S>(pub S, core::marker::PhantomData<T>);

impl<T, S> ChargeSponsored<T, S> {
	pub fn new(inner: S) -> Self {
		Self(inner, core::marker::PhantomData)
	}
}

// Forward TypeInfo to `S` so the extension is invisible in metadata —
// PAPI/PJS see only the inner extension and never learn about the
// wrapper.
impl<T, S: StaticTypeInfo> TypeInfo for ChargeSponsored<T, S> {
	type Identity = S;
	fn type_info() -> scale_info::Type {
		S::type_info()
	}
}

impl<T, S: Encode> core::fmt::Debug for ChargeSponsored<T, S> {
	#[cfg(feature = "std")]
	fn fmt(&self, f: &mut core::fmt::Formatter) -> core::fmt::Result {
		write!(f, "ChargeSponsored<{:?}>", self.0.encode())
	}
	#[cfg(not(feature = "std"))]
	fn fmt(&self, _: &mut core::fmt::Formatter) -> core::fmt::Result {
		Ok(())
	}
}

/// Intermediate value carried from `validate` to `prepare`. The
/// `Apply` variant stores the inner extension's own `Val`; the
/// `SponsorPay` variant records the resolved sponsor + fee for
/// settlement in `prepare`.
pub enum Val<T: Config, V> {
	Apply(V),
	SponsorPay { sponsor: T::AccountId, beneficiary: T::AccountId, fee: BalanceOf<T> },
}

/// Analogous `Pre` tag, used by `post_dispatch_details`.
pub enum Pre<P> {
	Apply(P),
	Sponsored,
}

impl<T, S> TransactionExtension<<T as frame_system::Config>::RuntimeCall> for ChargeSponsored<T, S>
where
	T: Config + Send + Sync,
	<T as frame_system::Config>::RuntimeCall:
		Dispatchable<Info = DispatchInfo, PostInfo = PostDispatchInfo>,
	BalanceOf<T>: Send + Sync,
	S: TransactionExtension<<T as frame_system::Config>::RuntimeCall>,
{
	// Forward identifier + metadata to the inner extension. This is what
	// makes the wrapper invisible to the outside world.
	const IDENTIFIER: &'static str = S::IDENTIFIER;
	type Implicit = S::Implicit;
	type Val = Val<T, S::Val>;
	type Pre = Pre<S::Pre>;

	fn metadata() -> scale_info::prelude::vec::Vec<
		frame::deps::sp_runtime::traits::TransactionExtensionMetadata,
	> {
		S::metadata()
	}

	fn implicit(&self) -> Result<Self::Implicit, TransactionValidityError> {
		self.0.implicit()
	}

	fn weight(&self, call: &<T as frame_system::Config>::RuntimeCall) -> Weight {
		// Sponsorship adds a pot read + pot write + a currency transfer
		// on top of the inner extension's own weight.
		self.0
			.weight(call)
			.saturating_add(T::DbWeight::get().reads_writes(2, 2))
	}

	fn validate(
		&self,
		origin: <<T as frame_system::Config>::RuntimeCall as Dispatchable>::RuntimeOrigin,
		call: &<T as frame_system::Config>::RuntimeCall,
		info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		len: usize,
		self_implicit: Self::Implicit,
		inherited_implication: &impl Implication,
		source: TransactionSource,
	) -> ValidateResult<Self::Val, <T as frame_system::Config>::RuntimeCall> {
		// Only signed origins are eligible. Unsigned / root txs fall
		// straight through to the inner extension.
		let beneficiary: Option<T::AccountId> = match origin.as_system_ref() {
			Some(raw) => raw.clone().as_signed().cloned(),
			None => None,
		};

		if let Some(beneficiary) = beneficiary {
			// Conservative upper bound on the fee, same heuristic the
			// previous standalone extension used. The real fee polynomial
			// lives inside `ChargeTransactionPayment`; benchmarks will
			// refine this later if needed.
			let fee: BalanceOf<T> = info.call_weight.ref_time().saturated_into();

			if let Some(sponsor) = Pallet::<T>::resolve_sponsor(&beneficiary, fee) {
				// Skip the inner extension entirely. The fee does NOT
				// pass through `ChargeTransactionPayment`, which means
				// `can_withdraw_fee` is never called on the beneficiary
				// — solving the balance-zero onboarding case.
				log::info!(
					target: "sponsorship::ext",
					"🎟️ validate SKIP inner: beneficiary={:?} sponsor={:?} fee={:?}",
					beneficiary, sponsor, fee,
				);
				return Ok((
					Default::default(),
					Val::SponsorPay { sponsor, beneficiary, fee },
					origin,
				));
			}

			log::trace!(
				target: "sponsorship::ext",
				"validate APPLY inner: beneficiary={:?} fee={:?} (no sponsor or empty pot)",
				beneficiary, fee,
			);
		}

		// No sponsorship applies: delegate to the inner extension.
		let (valid, inner_val, origin) = self.0.validate(
			origin,
			call,
			info,
			len,
			self_implicit,
			inherited_implication,
			source,
		)?;
		Ok((valid, Val::Apply(inner_val), origin))
	}

	fn prepare(
		self,
		val: Self::Val,
		origin: &<<T as frame_system::Config>::RuntimeCall as Dispatchable>::RuntimeOrigin,
		call: &<T as frame_system::Config>::RuntimeCall,
		info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		len: usize,
	) -> Result<Self::Pre, TransactionValidityError> {
		match val {
			Val::Apply(inner_val) => {
				let pre = self.0.prepare(inner_val, origin, call, info, len)?;
				Ok(Pre::Apply(pre))
			},
			Val::SponsorPay { sponsor, beneficiary, fee } => {
				log::info!(
					target: "sponsorship::ext",
					"⚡ prepare settling: sponsor={:?} beneficiary={:?} fee={:?}",
					sponsor, beneficiary, fee,
				);
				// Debit the sponsor's pot and burn the fee out of the
				// pallet account. We do NOT credit a specific destination
				// (validator / treasury) here — matching the MVP shape
				// of the previous extension and avoiding a circular
				// dependency on `OnChargeTransaction`. Production should
				// route the fee to the same destination as the native
				// extension via a runtime-wired handler.
				Pallet::<T>::settle_sponsorship(&sponsor, &Self::fee_destination(), fee)
					.map_err(|_| InvalidTransaction::Payment)?;
				Ok(Pre::Sponsored)
			},
		}
	}

	fn post_dispatch_details(
		pre: Self::Pre,
		info: &DispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		post_info: &PostDispatchInfoOf<<T as frame_system::Config>::RuntimeCall>,
		len: usize,
		result: &DispatchResult,
	) -> Result<Weight, TransactionValidityError> {
		match pre {
			Pre::Apply(inner_pre) => S::post_dispatch_details(inner_pre, info, post_info, len, result),
			// No refund in the sponsored path yet — over-estimation
			// remains in the fee destination rather than being returned
			// to the sponsor's pot. Matches the previous MVP behaviour.
			Pre::Sponsored => Ok(Weight::zero()),
		}
	}
}

impl<T: Config, S> ChargeSponsored<T, S> {
	/// Where sponsored fees land once the pot has been debited. Using
	/// the pallet account itself keeps the bookkeeping local: the fee
	/// just moves within the sponsorship pallet's sovereign account and
	/// is effectively burned relative to the sponsor's pot without
	/// leaking into the beneficiary's free balance.
	fn fee_destination() -> T::AccountId {
		Pallet::<T>::pallet_account()
	}
}


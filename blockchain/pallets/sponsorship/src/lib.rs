//! # Sponsorship Pallet
//!
//! Directed sponsorship: an account (the *sponsor*) authorises one or more
//! other accounts (*beneficiaries*) to have their transaction fees paid
//! from the sponsor's personal pot. The companion `ChargeSponsored`
//! transaction extension intercepts each dispatch, resolves the signer's
//! sponsor, and redirects the fee payment inside the runtime pipeline —
//! without the signer having to flag anything per-transaction.
//!
//! ### Model
//!
//! - Every sponsor has their own balance stored under `SponsorPots`.
//!   Funds are topped up by `top_up` and withdrawn by `withdraw`.
//! - A sponsor adds beneficiaries with `register_beneficiary`; the
//!   beneficiary list lives under `SponsorOf` keyed by the beneficiary
//!   for O(1) lookup inside the extension's `validate` hot path.
//! - A beneficiary may have **at most one active sponsor at a time**:
//!   re-registering simply overwrites the pointer. This keeps the
//!   TransactionExtension's lookup cost bounded to a single storage read
//!   per transaction.
//! - Either side can terminate the relationship: the sponsor via
//!   `revoke_beneficiary`, the beneficiary via `revoke_my_sponsor`.
//!
//! ### What the sponsor covers
//!
//! Only protocol-level fees (weight + length + tip), charged by
//! `pallet_transaction_payment::ChargeTransactionPayment`. Any in-pallet
//! transfers or bonds performed inside the dispatched extrinsic come out
//! of the beneficiary's own balance — the TransactionExtension runs
//! *before* dispatch and has no reach into business logic. This mirrors
//! how Lens Sponsorships and Gelato 1Balance behave on Ethereum.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod extension;
pub mod weights;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[cfg(feature = "runtime-benchmarks")]
pub mod benchmarking;

#[frame::pallet]
pub mod pallet {
	use crate::weights::WeightInfo;
	use frame::{
		prelude::*,
		traits::{Currency, ExistenceRequirement},
	};

	pub type BalanceOf<T> =
		<<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	#[pallet::config]
	pub trait Config: frame_system::Config<RuntimeEvent: From<Event<Self>>> {
		/// Native currency used for sponsor pots and fee transfers.
		type Currency: Currency<Self::AccountId>;

		/// Minimum amount a sponsor must keep deposited to be considered
		/// active. A pot below this threshold is effectively dormant and
		/// the extension will not pay fees from it even if the numeric
		/// balance is non-zero.
		#[pallet::constant]
		type MinimumPotBalance: Get<BalanceOf<Self>>;

		/// Weight information for extrinsics in this pallet.
		type WeightInfo: WeightInfo;
	}

	/// "Who is my sponsor?" — keyed by the **beneficiary** so the
	/// TransactionExtension can answer in a single storage read per tx.
	#[pallet::storage]
	pub type SponsorOf<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, T::AccountId, OptionQuery>;

	/// Per-sponsor pot balance. Mirrored separately from the signer's
	/// free balance so we can show a dedicated "sponsorship budget" in
	/// the UI and enforce a minimum-funded threshold.
	#[pallet::storage]
	pub type SponsorPots<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, BalanceOf<T>, ValueQuery>;

	/// Running count of beneficiaries per sponsor. Only used by the UI —
	/// neither the extension nor the extrinsics rely on it, so it is kept
	/// out of the hot path.
	#[pallet::storage]
	pub type BeneficiaryCount<T: Config> =
		StorageMap<_, Blake2_128Concat, T::AccountId, u32, ValueQuery>;

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// A sponsor added a beneficiary. If the beneficiary already had
		/// a sponsor, `previous_sponsor` is set to the one being replaced.
		BeneficiaryRegistered {
			sponsor: T::AccountId,
			beneficiary: T::AccountId,
			previous_sponsor: Option<T::AccountId>,
		},
		/// A sponsor removed one of their beneficiaries.
		BeneficiaryRevoked { sponsor: T::AccountId, beneficiary: T::AccountId },
		/// A beneficiary removed themselves from their sponsor's list.
		SponsorAbandoned { sponsor: T::AccountId, beneficiary: T::AccountId },
		/// A sponsor topped up their pot.
		PotToppedUp { sponsor: T::AccountId, amount: BalanceOf<T> },
		/// A sponsor withdrew remaining pot funds.
		PotWithdrawn { sponsor: T::AccountId, amount: BalanceOf<T> },
		/// A transaction's fee was covered by the sponsor.
		FeeSponsored { sponsor: T::AccountId, beneficiary: T::AccountId, fee: BalanceOf<T> },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// Caller attempted to sponsor themselves.
		CannotSponsorSelf,
		/// The caller has no sponsor authorization to revoke.
		NoActiveSponsor,
		/// Tried to revoke a beneficiary that is not registered under this
		/// sponsor (the beneficiary may have since re-registered with
		/// someone else).
		NotYourBeneficiary,
		/// The caller does not have enough free balance to top up the pot.
		InsufficientFunds,
		/// Requested withdrawal exceeds the sponsor's pot balance.
		WithdrawalExceedsPot,
		/// The on-chain pot bookkeeping diverged from the pallet account's
		/// free balance. Indicates a bug or state corruption — the
		/// extrinsic refuses to proceed rather than panicking, so the
		/// sponsor can surface it via governance.
		PotAccountingMismatch,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Authorise `beneficiary` to have their transaction fees paid
		/// from the caller's pot. Overwrites any previous sponsor the
		/// beneficiary had.
		#[pallet::call_index(0)]
		#[pallet::weight(T::WeightInfo::register_beneficiary())]
		pub fn register_beneficiary(
			origin: OriginFor<T>,
			beneficiary: T::AccountId,
		) -> DispatchResult {
			let sponsor = ensure_signed(origin)?;
			ensure!(sponsor != beneficiary, Error::<T>::CannotSponsorSelf);

			let previous_sponsor = SponsorOf::<T>::get(&beneficiary);

			// Adjust counters: bump the new sponsor, decrement the old
			// one (if any and different).
			if previous_sponsor.as_ref() != Some(&sponsor) {
				if let Some(old) = previous_sponsor.as_ref() {
					BeneficiaryCount::<T>::mutate(old, |c| *c = c.saturating_sub(1));
				}
				BeneficiaryCount::<T>::mutate(&sponsor, |c| *c = c.saturating_add(1));
			}

			SponsorOf::<T>::insert(&beneficiary, &sponsor);

			log::info!(
				target: "sponsorship",
				"🤝 register_beneficiary sponsor={:?} beneficiary={:?} previous={:?}",
				sponsor, beneficiary, previous_sponsor,
			);

			Self::deposit_event(Event::BeneficiaryRegistered {
				sponsor,
				beneficiary,
				previous_sponsor,
			});
			Ok(())
		}

		/// Revoke a beneficiary. No-op if someone else has since become
		/// their sponsor — we only remove the link when it still points at
		/// the caller to avoid racy cross-account deregistration.
		#[pallet::call_index(1)]
		#[pallet::weight(T::WeightInfo::revoke_beneficiary())]
		pub fn revoke_beneficiary(
			origin: OriginFor<T>,
			beneficiary: T::AccountId,
		) -> DispatchResult {
			let sponsor = ensure_signed(origin)?;
			let current =
				SponsorOf::<T>::get(&beneficiary).ok_or(Error::<T>::NotYourBeneficiary)?;
			ensure!(current == sponsor, Error::<T>::NotYourBeneficiary);

			SponsorOf::<T>::remove(&beneficiary);
			BeneficiaryCount::<T>::mutate(&sponsor, |c| *c = c.saturating_sub(1));

			log::info!(
				target: "sponsorship",
				"✂️ revoke_beneficiary sponsor={:?} beneficiary={:?}",
				sponsor, beneficiary,
			);

			Self::deposit_event(Event::BeneficiaryRevoked { sponsor, beneficiary });
			Ok(())
		}

		/// The beneficiary's escape hatch: unilaterally leave the current
		/// sponsor. Useful if the sponsor turns hostile (e.g. tries to
		/// shape content by threatening to cut them off).
		#[pallet::call_index(2)]
		#[pallet::weight(T::WeightInfo::revoke_my_sponsor())]
		pub fn revoke_my_sponsor(origin: OriginFor<T>) -> DispatchResult {
			let beneficiary = ensure_signed(origin)?;
			let sponsor = SponsorOf::<T>::take(&beneficiary).ok_or(Error::<T>::NoActiveSponsor)?;
			BeneficiaryCount::<T>::mutate(&sponsor, |c| *c = c.saturating_sub(1));

			log::info!(
				target: "sponsorship",
				"🏃 revoke_my_sponsor beneficiary={:?} sponsor={:?}",
				beneficiary, sponsor,
			);

			Self::deposit_event(Event::SponsorAbandoned { sponsor, beneficiary });
			Ok(())
		}

		/// Move `amount` from the caller's free balance into their
		/// sponsor pot. The pot is tracked separately from the caller's
		/// regular balance so withdrawals are explicit.
		#[pallet::call_index(3)]
		#[pallet::weight(T::WeightInfo::top_up())]
		pub fn top_up(origin: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let sponsor = ensure_signed(origin)?;

			T::Currency::transfer(
				&sponsor,
				&Self::pallet_account(),
				amount,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientFunds)?;

			SponsorPots::<T>::mutate(&sponsor, |b| *b = b.saturating_add(amount));

			log::info!(
				target: "sponsorship",
				"💰 top_up sponsor={:?} amount={:?} pot={:?}",
				sponsor, amount, SponsorPots::<T>::get(&sponsor),
			);

			Self::deposit_event(Event::PotToppedUp { sponsor, amount });
			Ok(())
		}

		/// Take `amount` out of the caller's pot and back into their free
		/// balance. Fails if the pot holds less than `amount`.
		#[pallet::call_index(4)]
		#[pallet::weight(T::WeightInfo::withdraw())]
		pub fn withdraw(origin: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let sponsor = ensure_signed(origin)?;
			SponsorPots::<T>::try_mutate(&sponsor, |b| -> DispatchResult {
				ensure!(*b >= amount, Error::<T>::WithdrawalExceedsPot);
				*b = b.saturating_sub(amount);
				Ok(())
			})?;

			// The bookkeeping invariant says SponsorPots ≤ free_balance of
			// the pallet account, so this transfer *should* succeed. If it
			// doesn't (e.g. after a slash or ED-related adjustment on the
			// pallet account), surface it as a recoverable error instead
			// of panicking — a panic here would halt the node.
			T::Currency::transfer(
				&Self::pallet_account(),
				&sponsor,
				amount,
				ExistenceRequirement::AllowDeath,
			)
			.map_err(|_| Error::<T>::PotAccountingMismatch)?;

			log::info!(
				target: "sponsorship",
				"🏦 withdraw sponsor={:?} amount={:?} pot_remaining={:?}",
				sponsor, amount, SponsorPots::<T>::get(&sponsor),
			);

			Self::deposit_event(Event::PotWithdrawn { sponsor, amount });
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		/// Sovereign account holding every sponsor's pot. We use a single
		/// pallet account with per-sponsor bookkeeping in `SponsorPots`
		/// rather than one PalletId-derived account per sponsor — simpler
		/// and enough for the MVP, since the bookkeeping is authoritative.
		pub fn pallet_account() -> T::AccountId {
			use frame::deps::sp_runtime::traits::AccountIdConversion;
			const ID: frame::deps::frame_support::PalletId =
				frame::deps::frame_support::PalletId(*b"sp/spons");
			ID.into_account_truncating()
		}

		/// O(1) lookup used by the TransactionExtension. Returns `None`
		/// when the signer has no sponsor, when the sponsor's pot is
		/// below `MinimumPotBalance`, or when the pot cannot cover `fee`.
		pub fn resolve_sponsor(signer: &T::AccountId, fee: BalanceOf<T>) -> Option<T::AccountId> {
			let sponsor = SponsorOf::<T>::get(signer)?;
			let pot = SponsorPots::<T>::get(&sponsor);
			if pot < T::MinimumPotBalance::get() || pot < fee {
				return None;
			}
			Some(sponsor)
		}

		/// Debit `fee` from the sponsor's pot and credit the same amount
		/// to `beneficiary`. Called by the TransactionExtension immediately
		/// before `ChargeTransactionPayment` charges the beneficiary — the
		/// net effect on the beneficiary's balance is zero.
		pub(crate) fn settle_sponsorship(
			sponsor: &T::AccountId,
			beneficiary: &T::AccountId,
			fee: BalanceOf<T>,
		) -> Result<(), ()> {
			// Decrement the bookkeeping first so we can short-circuit if
			// the pot somehow went stale between validate and prepare.
			SponsorPots::<T>::try_mutate(sponsor, |b| -> Result<(), ()> {
				if *b < fee {
					return Err(());
				}
				*b = b.saturating_sub(fee);
				Ok(())
			})?;

			T::Currency::transfer(
				&Self::pallet_account(),
				beneficiary,
				fee,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| ())?;

			log::info!(
				target: "sponsorship",
				"💸 settle_sponsorship sponsor={:?} beneficiary={:?} fee={:?} pot_remaining={:?}",
				sponsor, beneficiary, fee, SponsorPots::<T>::get(sponsor),
			);

			Self::deposit_event(Event::FeeSponsored {
				sponsor: sponsor.clone(),
				beneficiary: beneficiary.clone(),
				fee,
			});
			Ok(())
		}
	}
}

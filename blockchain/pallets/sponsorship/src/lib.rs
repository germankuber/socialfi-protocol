//! # Sponsorship Pallet (minimal)
//!
//! A single community pot that any account can donate to. The companion
//! `ChargeSponsored` transaction extension lets a signer opt into having
//! their fee paid from the pot instead of their own balance.
//!
//! This pallet is intentionally stripped-down — no per-app budgets, no
//! allowlists, no rate limits. The goal is to demonstrate the core
//! polkadot-sdk primitive involved: a custom `TransactionExtension` that
//! redirects fee payment inside the transaction pipeline.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod extension;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame::pallet]
pub mod pallet {
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
		/// Native currency used for both pot donations and fee payments.
		type Currency: Currency<Self::AccountId>;

		/// Account that holds the sponsorship pot. Funds are transferred
		/// into this account on top-up and out of it when a transaction
		/// extension redirects a fee payment. Typically a deterministic
		/// `PalletId` derivative so it is recognizable in block explorers.
		#[pallet::constant]
		type PotAccount: Get<Self::AccountId>;
	}

	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Somebody funded the sponsorship pot.
		ToppedUp { from: T::AccountId, amount: BalanceOf<T> },
		/// A transaction's fee was paid from the pot instead of the signer.
		FeeSponsored { who: T::AccountId, fee: BalanceOf<T> },
	}

	#[pallet::error]
	pub enum Error<T> {
		/// The caller does not have enough balance to top up the pot.
		InsufficientFunds,
	}

	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// Donate `amount` from the caller's free balance into the
		/// sponsorship pot. Anyone can top up.
		#[pallet::call_index(0)]
		#[pallet::weight(Weight::from_parts(20_000_000, 1800)
			.saturating_add(T::DbWeight::get().reads_writes(2, 2)))]
		pub fn top_up(origin: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
			let who = ensure_signed(origin)?;

			T::Currency::transfer(
				&who,
				&T::PotAccount::get(),
				amount,
				ExistenceRequirement::KeepAlive,
			)
			.map_err(|_| Error::<T>::InsufficientFunds)?;

			Self::deposit_event(Event::ToppedUp { from: who, amount });
			Ok(())
		}
	}

	impl<T: Config> Pallet<T> {
		/// Current free balance held by the pot account. Queried by the
		/// transaction extension and surfaced to the frontend for the
		/// "remaining budget" widget.
		pub fn pot_balance() -> BalanceOf<T> {
			T::Currency::free_balance(&T::PotAccount::get())
		}

		/// Pot account accessor. Exposed so the transaction extension can
		/// move funds out of it without needing to re-fetch the constant.
		pub fn pot_account() -> T::AccountId {
			T::PotAccount::get()
		}
	}
}

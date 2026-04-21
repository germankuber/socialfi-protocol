//! Unit tests for `pallet-sponsorship`.
//!
//! Focus: pot bookkeeping invariants (top-up / withdraw), beneficiary
//! registration lifecycle, and the error path that replaced the old
//! `.expect()` in `withdraw`.

use crate::{
	mock::{new_test_ext, Balances, RuntimeOrigin, Sponsorship, Test, BENEFICIARY, OTHER, SPONSOR},
	pallet::{BeneficiaryCount, Error, SponsorOf, SponsorPots},
};
use frame::{
	deps::{frame_support::assert_noop, sp_runtime::DispatchError},
	testing_prelude::*,
};

#[test]
fn top_up_moves_funds_into_pot() {
	new_test_ext().execute_with(|| {
		let before = Balances::free_balance(SPONSOR);
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		assert_eq!(Balances::free_balance(SPONSOR), before - 500);
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 500);
	});
}

#[test]
fn withdraw_refunds_sponsor() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		let before = Balances::free_balance(SPONSOR);
		assert_ok!(Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 200));
		assert_eq!(Balances::free_balance(SPONSOR), before + 200);
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 300);
	});
}

#[test]
fn withdraw_fails_exceeds_pot() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 100));
		assert_noop!(
			Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 101),
			Error::<Test>::WithdrawalExceedsPot
		);
	});
}

#[test]
fn withdraw_happy_path_no_longer_panics() {
	// Regression: previous implementation used `.expect()` after the
	// transfer, which would panic under a corrupted pot/account-balance
	// invariant. The current code returns `PotAccountingMismatch` —
	// we exercise the happy path here to confirm the replacement
	// compiles and preserves the successful case.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 1_000));
		assert_ok!(Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 1_000));
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), 0);
	});
}

#[test]
fn register_beneficiary_sets_pointer_and_counter() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_eq!(SponsorOf::<Test>::get(BENEFICIARY), Some(SPONSOR));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 1);
	});
}

#[test]
fn register_beneficiary_rejects_self_sponsor() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			Sponsorship::register_beneficiary(RuntimeOrigin::signed(SPONSOR), SPONSOR),
			Error::<Test>::CannotSponsorSelf
		);
	});
}

#[test]
fn register_beneficiary_reassignment_updates_counters() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 1);
		// OTHER steals the beneficiary.
		assert_ok!(Sponsorship::register_beneficiary(RuntimeOrigin::signed(OTHER), BENEFICIARY));
		assert_eq!(SponsorOf::<Test>::get(BENEFICIARY), Some(OTHER));
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 0);
		assert_eq!(BeneficiaryCount::<Test>::get(OTHER), 1);
	});
}

#[test]
fn revoke_beneficiary_removes_pointer() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::revoke_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert!(SponsorOf::<Test>::get(BENEFICIARY).is_none());
		assert_eq!(BeneficiaryCount::<Test>::get(SPONSOR), 0);
	});
}

#[test]
fn revoke_beneficiary_rejects_non_sponsor() {
	// OTHER cannot revoke SPONSOR's beneficiary.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_noop!(
			Sponsorship::revoke_beneficiary(RuntimeOrigin::signed(OTHER), BENEFICIARY),
			Error::<Test>::NotYourBeneficiary
		);
	});
}

#[test]
fn revoke_my_sponsor_is_the_beneficiary_escape_hatch() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::revoke_my_sponsor(RuntimeOrigin::signed(BENEFICIARY)));
		assert!(SponsorOf::<Test>::get(BENEFICIARY).is_none());
	});
}

#[test]
fn resolve_sponsor_honors_minimum_pot_balance() {
	// resolve_sponsor returns None when the pot is below the minimum
	// threshold, even if the pointer exists and the balance is positive.
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 5)); // under MinimumPotBalance=10
		assert!(crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 1).is_none());

		// Top up to cross the threshold.
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 10));
		assert_eq!(
			crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 1),
			Some(SPONSOR)
		);
	});
}

// ── Error branches and events ──────────────────────────────────────────

#[test]
fn revoke_my_sponsor_fails_without_active_sponsor() {
	new_test_ext().execute_with(|| {
		assert_noop!(
			Sponsorship::revoke_my_sponsor(RuntimeOrigin::signed(BENEFICIARY)),
			Error::<Test>::NoActiveSponsor,
		);
	});
}

#[test]
fn revoke_beneficiary_fails_when_no_pointer_exists() {
	// Distinct from `revoke_beneficiary_rejects_non_sponsor`: here
	// `SponsorOf` has no entry at all — the early `.ok_or` path hits
	// first (vs the `ensure!(current == sponsor)` branch).
	new_test_ext().execute_with(|| {
		assert_noop!(
			Sponsorship::revoke_beneficiary(RuntimeOrigin::signed(SPONSOR), BENEFICIARY),
			Error::<Test>::NotYourBeneficiary,
		);
	});
}

#[test]
fn top_up_fails_with_insufficient_funds() {
	new_test_ext().execute_with(|| {
		let pot_before = SponsorPots::<Test>::get(SPONSOR);
		assert_noop!(
			Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 100_000),
			Error::<Test>::InsufficientFunds,
		);
		// Pot unchanged after failure — rolled back by the transactional layer.
		assert_eq!(SponsorPots::<Test>::get(SPONSOR), pot_before);
	});
}

// Event assertions — previous tests only verified storage. These pin the
// public contract with indexers and the frontend.

#[test]
fn register_beneficiary_emits_event_with_no_previous_sponsor() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY,
		));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::BeneficiaryRegistered {
				sponsor: SPONSOR,
				beneficiary: BENEFICIARY,
				previous_sponsor: None,
			}
			.into(),
		);
	});
}

#[test]
fn register_beneficiary_emits_previous_sponsor_on_reassign() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY,
		));
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(OTHER),
			BENEFICIARY,
		));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::BeneficiaryRegistered {
				sponsor: OTHER,
				beneficiary: BENEFICIARY,
				previous_sponsor: Some(SPONSOR),
			}
			.into(),
		);
	});
}

#[test]
fn revoke_beneficiary_emits_event() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY,
		));
		assert_ok!(Sponsorship::revoke_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY,
		));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::BeneficiaryRevoked {
				sponsor: SPONSOR,
				beneficiary: BENEFICIARY,
			}
			.into(),
		);
	});
}

#[test]
fn revoke_my_sponsor_emits_event() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY,
		));
		assert_ok!(Sponsorship::revoke_my_sponsor(RuntimeOrigin::signed(BENEFICIARY)));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::SponsorAbandoned {
				sponsor: SPONSOR,
				beneficiary: BENEFICIARY,
			}
			.into(),
		);
	});
}

#[test]
fn top_up_emits_event() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::PotToppedUp { sponsor: SPONSOR, amount: 500 }.into(),
		);
	});
}

#[test]
fn withdraw_emits_event() {
	new_test_ext().execute_with(|| {
		frame_system::Pallet::<Test>::set_block_number(1);
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 500));
		assert_ok!(Sponsorship::withdraw(RuntimeOrigin::signed(SPONSOR), 200));
		frame_system::Pallet::<Test>::assert_last_event(
			crate::Event::PotWithdrawn { sponsor: SPONSOR, amount: 200 }.into(),
		);
	});
}

#[test]
fn extrinsics_reject_unsigned_origin() {
	// Single consolidated BadOrigin test — all 5 extrinsics use plain
	// `ensure_signed`, so one test covers the shared invariant with
	// minimal noise.
	new_test_ext().execute_with(|| {
		assert_noop!(
			Sponsorship::register_beneficiary(RuntimeOrigin::none(), BENEFICIARY),
			DispatchError::BadOrigin,
		);
		assert_noop!(
			Sponsorship::revoke_beneficiary(RuntimeOrigin::none(), BENEFICIARY),
			DispatchError::BadOrigin,
		);
		assert_noop!(
			Sponsorship::revoke_my_sponsor(RuntimeOrigin::none()),
			DispatchError::BadOrigin,
		);
		assert_noop!(
			Sponsorship::top_up(RuntimeOrigin::none(), 100),
			DispatchError::BadOrigin,
		);
		assert_noop!(
			Sponsorship::withdraw(RuntimeOrigin::none(), 100),
			DispatchError::BadOrigin,
		);
	});
}

#[test]
fn resolve_sponsor_returns_none_when_fee_exceeds_pot() {
	new_test_ext().execute_with(|| {
		assert_ok!(Sponsorship::register_beneficiary(
			RuntimeOrigin::signed(SPONSOR),
			BENEFICIARY
		));
		assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 50));
		// fee (100) > pot (50).
		assert!(crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 100).is_none());
		// fee (30) ≤ pot (50).
		assert_eq!(
			crate::Pallet::<Test>::resolve_sponsor(&BENEFICIARY, 30),
			Some(SPONSOR)
		);
	});
}

// ── ChargeSponsored TransactionExtension ───────────────────────────────
//
// The extension's invariants are the gnarliest part of the pallet — a bug
// here either steals from sponsor pots or forwards the charge to the
// beneficiary. Tests below instantiate `ChargeSponsored<Test, MockInner>`
// directly and drive the three hooks (`validate`, `prepare`,
// `post_dispatch_details`) so each branch is exercised in isolation,
// without depending on a real `ChargeTransactionPayment` wired into the
// runtime.
mod extension_tests {
	use super::*;
	use crate::{
		extension::{ChargeSponsored, Pre, Val},
		mock::{RuntimeCall, RuntimeEvent},
		pallet::Event as SponsorshipEvent,
	};
	use codec::{Decode, DecodeWithMemTracking, Encode};
	use frame::deps::frame_support::{
		dispatch::{DispatchInfo, PostDispatchInfo},
		pallet_prelude::TransactionSource,
	};
	use frame::deps::sp_runtime::{
		traits::{
			DispatchInfoOf, Implication, TransactionExtension, TxBaseImplication,
		},
		transaction_validity::{InvalidTransaction, TransactionValidityError, ValidTransaction},
		DispatchError,
	};
	use scale_info::TypeInfo;

	/// Minimal inner extension used as `S` in `ChargeSponsored<T, S>`.
	/// Every hook is deterministic:
	/// - `validate` returns `ValidTransaction::default()` and an empty
	///   `Val`;
	/// - `prepare` returns `()` or an error when the internal flag is set;
	/// - `post_dispatch_details` returns a fixed weight we can assert on.
	///
	/// A thread-local flag lets individual tests toggle the `validate`
	/// hook into an error-returning mode so we can assert the wrapper
	/// propagates inner failures when no sponsorship applies.
	use core::cell::Cell;
	thread_local! {
		static INNER_VALIDATE_FAILS: Cell<bool> = const { Cell::new(false) };
	}

	#[derive(Encode, Decode, DecodeWithMemTracking, Clone, Eq, PartialEq, TypeInfo, Default, Debug)]
	pub struct MockInner;

	impl<Call> TransactionExtension<Call> for MockInner
	where
		Call: frame::deps::sp_runtime::traits::Dispatchable<
			Info = DispatchInfo,
			PostInfo = PostDispatchInfo,
		>,
	{
		const IDENTIFIER: &'static str = "MockInner";
		type Implicit = ();
		type Val = ();
		type Pre = ();

		fn weight(&self, _call: &Call) -> Weight {
			Weight::zero()
		}

		fn validate(
			&self,
			origin: <Call as frame::deps::sp_runtime::traits::Dispatchable>::RuntimeOrigin,
			_call: &Call,
			_info: &DispatchInfoOf<Call>,
			_len: usize,
			_self_implicit: Self::Implicit,
			_inherited_implication: &impl Implication,
			_source: TransactionSource,
		) -> Result<
			(
				ValidTransaction,
				Self::Val,
				<Call as frame::deps::sp_runtime::traits::Dispatchable>::RuntimeOrigin,
			),
			TransactionValidityError,
		> {
			if INNER_VALIDATE_FAILS.with(|f| f.get()) {
				return Err(InvalidTransaction::Call.into());
			}
			Ok((ValidTransaction::default(), (), origin))
		}

		fn prepare(
			self,
			_val: Self::Val,
			_origin: &<Call as frame::deps::sp_runtime::traits::Dispatchable>::RuntimeOrigin,
			_call: &Call,
			_info: &DispatchInfoOf<Call>,
			_len: usize,
		) -> Result<Self::Pre, TransactionValidityError> {
			Ok(())
		}
	}

	/// Build a `DispatchInfo` with the given ref-time weight — this is what
	/// `ChargeSponsored::validate` feeds into `info.call_weight.ref_time()`
	/// to compute the sponsorship fee estimate.
	fn info_with_weight(ref_time: u64) -> DispatchInfo {
		DispatchInfo {
			call_weight: Weight::from_parts(ref_time, 0),
			extension_weight: Weight::zero(),
			class: Default::default(),
			pays_fee: Default::default(),
		}
	}

	fn arm_inner_failure() {
		INNER_VALIDATE_FAILS.with(|f| f.set(true));
	}

	fn reset_inner_failure() {
		INNER_VALIDATE_FAILS.with(|f| f.set(false));
	}

	/// A throwaway call used as the dispatchable — `remark` is the cheapest
	/// system extrinsic and has no runtime side effects.
	fn dummy_call() -> RuntimeCall {
		RuntimeCall::System(frame_system::Call::remark { remark: vec![] })
	}

	/// (a) Signed beneficiary with funded sponsor pot: `validate` must
	/// skip the inner extension and return `SponsorPay`, then `prepare`
	/// must debit the pot and emit `FeeSponsored`.
	#[test]
	fn extension_sponsors_funded_pot() {
		new_test_ext().execute_with(|| {
			reset_inner_failure();
			frame_system::Pallet::<Test>::set_block_number(1);
			assert_ok!(Sponsorship::register_beneficiary(
				RuntimeOrigin::signed(SPONSOR),
				BENEFICIARY
			));
			assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 1_000));
			let pot_before = SponsorPots::<Test>::get(SPONSOR);

			let ext = ChargeSponsored::<Test, MockInner>::new(MockInner);
			let call = dummy_call();
			let info = info_with_weight(100);

			let (_, val, _origin) = ext
				.validate(
					RuntimeOrigin::signed(BENEFICIARY),
					&call,
					&info,
					0,
					(),
					&TxBaseImplication(()),
					TransactionSource::External,
				)
				.expect("validate succeeds under funded sponsor");

			assert!(matches!(val, Val::SponsorPay { .. }));

			let pre = ChargeSponsored::<Test, MockInner>::new(MockInner)
				.prepare(val, &RuntimeOrigin::signed(BENEFICIARY), &call, &info, 0)
				.expect("prepare settles");
			assert!(matches!(pre, Pre::Sponsored));

			assert_eq!(SponsorPots::<Test>::get(SPONSOR), pot_before - 100);
			// `FeeSponsored.beneficiary` is the pallet account (the fee
			// destination), NOT the tx signer — the extension debits the
			// pot and burns the fee inside the pallet's sovereign account
			// (see `extension.rs::fee_destination`).
			let pallet_account = crate::Pallet::<Test>::pallet_account();
			let emitted = frame_system::Pallet::<Test>::events().into_iter().any(|r| {
				matches!(
					r.event,
					RuntimeEvent::Sponsorship(SponsorshipEvent::FeeSponsored {
						sponsor,
						beneficiary,
						fee: 100,
					}) if sponsor == SPONSOR && beneficiary == pallet_account
				)
			});
			assert!(emitted, "FeeSponsored event missing");
		});
	}

	/// (b) Sponsor registered but pot too small: `resolve_sponsor` returns
	/// `None`, so the wrapper must delegate to the inner extension — the
	/// pot stays untouched.
	#[test]
	fn extension_delegates_when_pot_insufficient() {
		new_test_ext().execute_with(|| {
			reset_inner_failure();
			assert_ok!(Sponsorship::register_beneficiary(
				RuntimeOrigin::signed(SPONSOR),
				BENEFICIARY
			));
			// Pot below MinimumPotBalance (10).
			assert_ok!(Sponsorship::top_up(RuntimeOrigin::signed(SPONSOR), 5));
			let pot_before = SponsorPots::<Test>::get(SPONSOR);

			let ext = ChargeSponsored::<Test, MockInner>::new(MockInner);
			let (_, val, _) = ext
				.validate(
					RuntimeOrigin::signed(BENEFICIARY),
					&dummy_call(),
					&info_with_weight(100),
					0,
					(),
					&TxBaseImplication(()),
					TransactionSource::External,
				)
				.expect("validate delegates");

			assert!(matches!(val, Val::Apply(_)));
			assert_eq!(SponsorPots::<Test>::get(SPONSOR), pot_before);
		});
	}

	/// (c) Signed beneficiary without any sponsor registered: the wrapper
	/// must hand over to the inner extension unchanged.
	#[test]
	fn extension_delegates_when_no_sponsor() {
		new_test_ext().execute_with(|| {
			reset_inner_failure();

			let ext = ChargeSponsored::<Test, MockInner>::new(MockInner);
			let (_, val, _) = ext
				.validate(
					RuntimeOrigin::signed(BENEFICIARY),
					&dummy_call(),
					&info_with_weight(100),
					0,
					(),
					&TxBaseImplication(()),
					TransactionSource::External,
				)
				.expect("validate delegates");

			assert!(matches!(val, Val::Apply(_)));
		});
	}

	/// (f) `post_dispatch_details` under the `Pre::Sponsored` variant
	/// returns `Weight::zero()` (no refund) as documented.
	#[test]
	fn extension_post_dispatch_sponsored_returns_zero_weight() {
		new_test_ext().execute_with(|| {
			let info = info_with_weight(100);
			let post_info = PostDispatchInfo {
				actual_weight: Some(Weight::from_parts(50, 0)),
				pays_fee: Default::default(),
			};

			let weight = ChargeSponsored::<Test, MockInner>::post_dispatch_details(
				Pre::Sponsored,
				&info,
				&post_info,
				0,
				&Ok::<(), DispatchError>(()),
			)
			.expect("post_dispatch returns weight");

			assert_eq!(weight, Weight::zero());
		});
	}

	/// (g) Inner extension fails in the no-sponsor branch: the wrapper
	/// must propagate the error. Guards against a refactor that
	/// accidentally swallows inner validation failures.
	#[test]
	fn extension_propagates_inner_validate_failure() {
		new_test_ext().execute_with(|| {
			arm_inner_failure();

			let ext = ChargeSponsored::<Test, MockInner>::new(MockInner);
			let result = ext.validate(
				RuntimeOrigin::signed(BENEFICIARY),
				&dummy_call(),
				&info_with_weight(100),
				0,
				(),
				&TxBaseImplication(()),
				TransactionSource::External,
			);
			reset_inner_failure();

			assert!(matches!(result, Err(TransactionValidityError::Invalid(_))));
		});
	}
}

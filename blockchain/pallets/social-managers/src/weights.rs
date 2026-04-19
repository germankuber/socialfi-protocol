//! Placeholder weights for `pallet-social-managers`.
//!
//! These numbers are hand-picked approximations loosely modelled after
//! `pallet-proxy`. They should be replaced with machine-generated values from
//! `frame-benchmarking` before any production deployment.

#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(unused_parens)]
#![allow(unused_imports)]

use frame::{deps::frame_support::weights::constants::RocksDbWeight, prelude::*};
use core::marker::PhantomData;

/// Weight functions needed for `pallet-social-managers`.
pub trait WeightInfo {
	fn add_manager() -> Weight;
	fn remove_manager() -> Weight;
	fn remove_all_managers(n: u32) -> Weight;
	fn act_as_manager() -> Weight;
}

pub struct SubstrateWeight<T>(PhantomData<T>);
impl<T: frame_system::Config> WeightInfo for SubstrateWeight<T> {
	fn add_manager() -> Weight {
		Weight::from_parts(18_000_000, 1800)
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}

	fn remove_manager() -> Weight {
		Weight::from_parts(15_000_000, 1600)
			.saturating_add(T::DbWeight::get().reads(2_u64))
			.saturating_add(T::DbWeight::get().writes(2_u64))
	}

	/// Linear in the number of managers removed. Caller bears the storage
	/// iteration cost for their own revoke-all, which is correct economically.
	fn remove_all_managers(n: u32) -> Weight {
		Weight::from_parts(10_000_000, 1400)
			.saturating_add(Weight::from_parts(5_000_000, 0).saturating_mul(n.into()))
			.saturating_add(T::DbWeight::get().reads((n as u64).saturating_add(1)))
			.saturating_add(T::DbWeight::get().writes((n as u64).saturating_add(1)))
	}

	/// Intentionally does NOT include the inner call's weight. Callers are
	/// expected to add `call.get_dispatch_info().call_weight` at the dispatch
	/// site (see `act_as_manager` in `lib.rs`).
	fn act_as_manager() -> Weight {
		Weight::from_parts(20_000_000, 1800)
			.saturating_add(T::DbWeight::get().reads(2_u64))
	}
}

impl WeightInfo for () {
	fn add_manager() -> Weight {
		Weight::from_parts(18_000_000, 1800)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}

	fn remove_manager() -> Weight {
		Weight::from_parts(15_000_000, 1600)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
			.saturating_add(RocksDbWeight::get().writes(2_u64))
	}

	fn remove_all_managers(n: u32) -> Weight {
		Weight::from_parts(10_000_000, 1400)
			.saturating_add(Weight::from_parts(5_000_000, 0).saturating_mul(n.into()))
			.saturating_add(RocksDbWeight::get().reads((n as u64).saturating_add(1)))
			.saturating_add(RocksDbWeight::get().writes((n as u64).saturating_add(1)))
	}

	fn act_as_manager() -> Weight {
		Weight::from_parts(20_000_000, 1800)
			.saturating_add(RocksDbWeight::get().reads(2_u64))
	}
}

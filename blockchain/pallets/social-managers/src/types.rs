//! On-chain types for the Social Managers pallet.
//!
//! A profile owner authorizes another account (the "manager") to perform
//! specific social actions on their behalf. The scopes are stored as a bitmask
//! so a single manager can hold multiple permissions atomically.

use codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
use frame::prelude::*;
use scale_info::TypeInfo;

use super::pallet::{BalanceOf, Config};

/// A single delegated permission. Scopes are stored as a `u16` bitmask in
/// [`ManagerInfo::scopes`] so that one manager entry can authorize multiple
/// actions without duplicating storage rows.
///
/// Bit assignments are stable and MUST NOT be reordered: they are persisted
/// on-chain and any reshuffle would silently change every existing manager's
/// effective permissions.
#[repr(u16)]
#[derive(Encode, Decode, Clone, Copy, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum ManagerScope {
	/// Authorize calls to `pallet_social_feeds::create_post`.
	Post = 1 << 0,
	/// Authorize calls to `pallet_social_feeds::create_reply`.
	Comment = 1 << 1,
	/// Authorize calls to `pallet_social_graph::follow` / `unfollow`.
	Follow = 1 << 2,
	/// Reserved for future collect/tip extrinsics. Included now so the bitmask
	/// layout is stable when those features land.
	Collect = 1 << 3,
	/// Authorize calls to `pallet_social_profiles::update_metadata` and
	/// `set_follow_fee`. Deliberately kept separate from `Post` because this
	/// grants mutation of the owner's public identity.
	UpdateProfile = 1 << 4,
}

impl ManagerScope {
	/// Convenience mask used by `remove_all_managers` and by callers that want
	/// to grant "everything this pallet currently supports".
	pub const ALL: u16 = (Self::Post as u16) |
		(Self::Comment as u16) |
		(Self::Follow as u16) |
		(Self::Collect as u16) |
		(Self::UpdateProfile as u16);
}

/// Raw bitmask of [`ManagerScope`] values authorized for a single manager.
///
/// We use a `u16` wrapper instead of a third-party bitflags crate to keep the
/// pallet's dependency surface minimal and to get `MaxEncodedLen` for free.
#[derive(
	Encode,
	Decode,
	DecodeWithMemTracking,
	Clone,
	Copy,
	PartialEq,
	Eq,
	RuntimeDebug,
	TypeInfo,
	MaxEncodedLen,
	Default,
)]
pub struct ScopeMask(pub u16);

impl ScopeMask {
	/// Build a `ScopeMask` from a slice of scopes. The slice may contain
	/// duplicates; bitwise OR deduplicates them implicitly.
	pub fn from_scopes(scopes: &[ManagerScope]) -> Self {
		let mut mask = 0u16;
		for s in scopes {
			mask |= *s as u16;
		}
		Self(mask)
	}

	/// Returns `true` when every bit of `required` is set in this mask.
	///
	/// Used by the dispatch filter when mapping a `RuntimeCall` to the minimum
	/// scope that authorizes it: the manager holds the permission only if the
	/// authorized mask is a superset of the required bits.
	pub fn contains(&self, required: ManagerScope) -> bool {
		self.0 & (required as u16) == (required as u16)
	}

	/// Returns `true` if no scope bits are set. An empty mask represents a
	/// revoked-but-not-yet-purged manager entry.
	pub fn is_empty(&self) -> bool {
		self.0 == 0
	}
}

/// Per-manager record stored under `(owner, manager)`.
///
/// `deposit` is the balance reserved from the owner when the manager was
/// added. It is released back to the owner when the manager is removed,
/// either explicitly (`remove_manager`) or lazily by `on_idle` after expiry.
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct ManagerInfo<T: Config> {
	/// Which actions this manager is authorized to perform.
	pub scopes: ScopeMask,
	/// Block number at which this authorization expires. `None` means the
	/// authorization is valid until explicitly revoked.
	pub expires_at: Option<BlockNumberFor<T>>,
	/// Deposit reserved from the owner for this entry. Tracked on the record
	/// itself (rather than computed from a constant) so that a future increase
	/// to `ManagerDepositFactor` does not retroactively slash existing entries
	/// when they are removed.
	pub deposit: BalanceOf<T>,
}

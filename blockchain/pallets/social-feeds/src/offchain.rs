//! Offchain worker for `pallet-social-feeds`.
//!
//! The OCW runs inside the runtime WASM — the crypto crates we depend
//! on (`crypto_box`, `rand_chacha`, `zeroize`) are configured with
//! `default-features = false` plus `alloc` so they compile in no_std.
//!
//! Every imported block, each collator runs this hook. The worker:
//!
//! 1. Early-returns if the node is not a validator (collator).
//! 2. Loads the custodial X25519 secret key from local offchain DB
//!    (under `p2d::collator_sk::v1`; inserted by the CLI or genesis
//!    helper). Without it, it warns and exits.
//! 3. Iterates `PendingUnlocks`, locking each `(post_id, viewer)` for
//!    a few seconds so two consecutive blocks don't race.
//! 4. Opens the post's `capsule` with the custodial secret → `k_content`.
//! 5. Re-seals `k_content` to the viewer's ephemeral X25519 pk.
//! 6. Submits `deliver_unlock_unsigned` with an sr25519 signed payload.
//! 7. Zeroizes `k_content` before returning.

use crate::{
	dev_key,
	pallet::{
		Call, Config, DeliverUnlockPayload, KeyService, PendingUnlocks, Posts, Unlocks,
	},
	types::{SEALED_KEY_LEN, X25519_PK_LEN},
};
use codec::Encode;
use crypto_box::PublicKey as CboxPublic;
use frame::{
	deps::{
		frame_system,
		sp_io,
		sp_runtime::offchain::{
			storage_lock::{BlockAndTime, StorageLock},
			Duration,
		},
	},
	prelude::*,
};
use frame::deps::frame_system::offchain::{SendUnsignedTransaction, Signer};
use rand_chacha::{rand_core::SeedableRng, ChaCha20Rng};

/// Max pending unlocks processed per block — prevents a pathological
/// backlog from stalling block production.
const MAX_DELIVERIES_PER_BLOCK: usize = 16;

/// Lock TTL; comfortably larger than crypto + network latency.
const LOCK_TTL_MS: u64 = 5_000;

#[derive(Debug)]
enum OcwError {
	DecryptFailed,
	SealFailed,
	Encoding,
	SubmitFailed,
	Gone,
}

/// Entry point called from `Pallet::offchain_worker`.
pub fn run<T: Config>(block_number: BlockNumberFor<T>) {
	if !sp_io::offchain::is_validator() {
		log::trace!(target: "social-feeds::ocw", "skip: not a validator");
		return;
	}

	let ks = match KeyService::<T>::get() {
		Some(ks) => ks,
		None => {
			log::trace!(target: "social-feeds::ocw", "skip: key service not set");
			return;
		},
	};

	// Dev mode: derive the custodial sk from the compiled-in seed.
	// Production would replace this with a keystore-derived HKDF,
	// a TEE-backed oracle, or a DKG-shared secret.
	let sk = dev_key::secret_key();

	let pending_count = PendingUnlocks::<T>::iter().count();
	if pending_count == 0 {
		log::trace!(target: "social-feeds::ocw", "nothing to deliver at block {:?}", block_number);
		return;
	}
	log::info!(
		target: "social-feeds::ocw",
		"🛰️ OCW tick block={:?} pending={} key_service_version={}",
		block_number, pending_count, ks.version,
	);

	let mut delivered = 0usize;
	for ((post_id, viewer), _) in PendingUnlocks::<T>::iter() {
		if delivered >= MAX_DELIVERIES_PER_BLOCK {
			break;
		}

		let lock_key = (b"feeds-unlock-lock", post_id, viewer.clone()).encode();
		let mut lock =
			StorageLock::<BlockAndTime<frame_system::Pallet<T>>>::with_block_and_time_deadline(
				&lock_key,
				2u32.into(),
				Duration::from_millis(LOCK_TTL_MS),
			);
		let guard = match lock.try_lock() {
			Ok(g) => g,
			Err(_) => continue,
		};

		match try_deliver::<T>(&sk, post_id, &viewer, block_number) {
			Ok(()) => {
				delivered += 1;
				log::info!(
					target: "social-feeds::ocw",
					"✅ delivered post_id={:?} viewer={:?}", post_id, viewer,
				);
			},
			Err(OcwError::Gone) => {},
			Err(err) => log::warn!(
				target: "social-feeds::ocw",
				"deliver failed for post {:?} viewer {:?}: {:?}", post_id, viewer, err,
			),
		}
		drop(guard);
	}

	let _ = ks;
}

fn try_deliver<T: Config>(
	sk: &crypto_box::SecretKey,
	post_id: T::PostId,
	viewer: &T::AccountId,
	block_number: BlockNumberFor<T>,
) -> Result<(), OcwError> {
	let record = Unlocks::<T>::get(post_id, viewer).ok_or(OcwError::Gone)?;
	if record.wrapped_key.is_some() {
		return Err(OcwError::Gone);
	}

	let post = Posts::<T>::get(post_id).ok_or(OcwError::Gone)?;
	let capsule_bytes = post.capsule.as_ref().ok_or(OcwError::Gone)?.to_vec();

	// 1. Open capsule → k_content.
	let k_content = sk.unseal(&capsule_bytes).map_err(|_| OcwError::DecryptFailed)?;

	// 2. Re-seal to the viewer's ephemeral pk.
	let buyer_pk = CboxPublic::from(record.buyer_pk);
	let mut rng = ChaCha20Rng::from_seed(sp_io::offchain::random_seed());
	let wrapped = buyer_pk.seal(&mut rng, &k_content).map_err(|_| OcwError::SealFailed)?;

	// 3. Zeroize k_content before leaving the scope.
	{
		use zeroize::Zeroize;
		let mut k = k_content;
		k.zeroize();
	}

	if wrapped.len() as u32 != SEALED_KEY_LEN {
		return Err(OcwError::SealFailed);
	}
	let wrapped_key: BoundedVec<u8, ConstU32<{ SEALED_KEY_LEN }>> =
		wrapped.try_into().map_err(|_| OcwError::Encoding)?;

	// 4. Sign + submit.
	let signer = Signer::<T, T::AuthorityId>::any_account();
	let result = signer.send_unsigned_transaction(
		|account| DeliverUnlockPayload {
			public: account.public.clone(),
			block_number,
			post_id,
			viewer: viewer.clone(),
			wrapped_key: wrapped_key.clone(),
		},
		|payload, signature| Call::deliver_unlock_unsigned { payload, signature },
	);
	match result {
		Some((_, Ok(()))) => Ok(()),
		_ => Err(OcwError::SubmitFailed),
	}
}

// Type-level guards to keep constants in sync with pallet bounds.
const _: () = assert!(SEALED_KEY_LEN == 80);
const _: () = assert!(X25519_PK_LEN == 32);

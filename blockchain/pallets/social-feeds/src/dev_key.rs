//! Deterministic keys for the development key-service.
//!
//! Two keys live here, both public and intentionally in-source:
//!
//! * The **X25519 keypair** used by the offchain worker to unseal
//!   post capsules ([`secret_key`] / [`public_key_bytes`]).
//! * The **sr25519 key-service identity** whose account signs
//!   `deliver_unlock_unsigned` transactions ([`key_service_suri`],
//!   [`key_service_account_id`], [`key_service_public`]).
//!
//! Neither key should be used on a network that carries real value.
//! The real protocol would replace this module with a keystore-derived
//! HKDF, a TEE-backed oracle, or a DKG-shared secret — the OCW,
//! genesis preset, and node startup all funnel through the helpers
//! defined here so swapping the module is a single-point change.

use crypto_box::{PublicKey, SecretKey};

/// 32 fixed bytes that seed the dev X25519 secret key. The value is
/// `blake2b_256("p2d/dev/x25519/v1")` computed ahead of time — any
/// arbitrary constant would work as long as the genesis-side and the
/// OCW-side agree.
pub const DEV_SEED: [u8; 32] = [
	0xf3, 0xae, 0x2c, 0x3b, 0x74, 0x6f, 0x55, 0x87,
	0x4e, 0x10, 0xa1, 0x9d, 0x0c, 0xde, 0x43, 0xc2,
	0x91, 0x7b, 0x68, 0x0f, 0x4c, 0x3a, 0xee, 0x9c,
	0x2b, 0x8d, 0x55, 0x01, 0xaf, 0x67, 0x30, 0xe4,
];

/// The dev X25519 secret key. Deterministic from [`DEV_SEED`] — the
/// `crypto_box::SecretKey::from` constructor interprets the 32 bytes
/// directly as an X25519 scalar.
pub fn secret_key() -> SecretKey {
	SecretKey::from(DEV_SEED)
}

/// The matching public key. Computed at runtime so we don't hardcode a
/// second constant that could drift from `DEV_SEED`.
pub fn public_key_bytes() -> [u8; 32] {
	PublicKey::from(&secret_key()).as_bytes().clone()
}

/// Derivation path for the sr25519 identity the OCW uses to sign
/// `deliver_unlock_unsigned`. Separate from Alice/Bob/Charlie so the
/// key-service is clearly its own entity — it only ever signs unlock
/// deliveries, it never authors blocks and is not used by the UI.
///
/// Kept as a documentation anchor: the corresponding public key below
/// was derived from this SURI via `sp_core::sr25519::Pair::from_string`
/// (off-line) and hardcoded so this module compiles in `no_std`.
pub const KEY_SERVICE_SURI: &str = "//KeyService";

/// 32-byte `AccountId` of `//KeyService` (sr25519 public key). Stored
/// on-chain as `KeyServiceInfo::account` and used by `ValidateUnsigned`
/// to verify the signed payload delivered by the OCW.
///
/// To regenerate: `subkey inspect //KeyService --scheme sr25519`, or
/// run the offline derivation helper. Must stay in sync with the SURI.
pub const KEY_SERVICE_ACCOUNT_ID: [u8; 32] = [
	0x96, 0xde, 0x8f, 0x93, 0xb5, 0x83, 0x96, 0x14,
	0xcd, 0xd8, 0x84, 0xb7, 0xa6, 0x1d, 0xe5, 0xc1,
	0x8d, 0x3c, 0x37, 0x7a, 0x32, 0x44, 0x6d, 0x5a,
	0x58, 0x98, 0xb5, 0xb1, 0x57, 0xa6, 0x12, 0x62,
];

/// Returns the 32-byte sr25519 public key of the key-service account.
pub const fn key_service_account_id() -> [u8; 32] {
	KEY_SERVICE_ACCOUNT_ID
}

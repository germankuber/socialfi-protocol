use crate::{
	AccountId, BalancesConfig, CollatorSelectionConfig, ParachainInfoConfig, PolkadotXcmConfig,
	RuntimeGenesisConfig, SessionConfig, SessionKeys, SocialFeedsConfig, SudoConfig,
	EXISTENTIAL_DEPOSIT,
};

use alloc::{vec, vec::Vec};

use polkadot_sdk::{staging_xcm as xcm, *};

use cumulus_primitives_core::ParaId;
use frame_support::build_struct_json_patch;
use parachains_common::AuraId;
use serde_json::Value;
use sp_genesis_builder::PresetId;
use sp_keyring::Sr25519Keyring;
use xcm::prelude::XCM_VERSION;

/// The default XCM version to set in genesis config.
const SAFE_XCM_VERSION: u32 = XCM_VERSION;
/// Parachain id used for genesis config presets.
pub const PARACHAIN_ID: u32 = 1000;

/// Generate the session keys from individual elements.
pub fn template_session_keys(keys: AuraId) -> SessionKeys {
	SessionKeys { aura: keys }
}

fn testnet_genesis(
	invulnerables: Vec<(AccountId, AuraId)>,
	endowed_accounts: Vec<AccountId>,
	root: AccountId,
	id: ParaId,
) -> Value {
	// The key-service account is the identity the collator's OCW uses
	// to sign `deliver_unlock_unsigned`. Kept distinct from Alice/Bob
	// so it's obvious that unlock deliveries do not come from the same
	// account the UI signs with.
	let key_service_account =
		sp_core::crypto::AccountId32::from(pallet_social_feeds::dev_key::key_service_account_id());

	// Endow it so the on-chain `KeyServiceInfo::account` resolves to a
	// real, reachable account (the unsigned payload carries the public
	// key, but the account needs to exist for downstream consumers and
	// future migrations that might add a fee path).
	let mut endowed = endowed_accounts;
	if !endowed.iter().any(|a| a == &key_service_account) {
		endowed.push(key_service_account.clone());
	}

	build_struct_json_patch!(RuntimeGenesisConfig {
		balances: BalancesConfig {
			balances: endowed.iter().cloned().map(|k| (k, 1u128 << 60)).collect::<Vec<_>>(),
		},
		parachain_info: ParachainInfoConfig { parachain_id: id },
		collator_selection: CollatorSelectionConfig {
			invulnerables: invulnerables.iter().cloned().map(|(acc, _)| acc).collect::<Vec<_>>(),
			candidacy_bond: EXISTENTIAL_DEPOSIT * 16,
		},
		session: SessionConfig {
			keys: invulnerables
				.into_iter()
				.map(|(acc, aura)| { (acc.clone(), acc, template_session_keys(aura),) })
				.collect::<Vec<_>>(),
		},
		polkadot_xcm: PolkadotXcmConfig { safe_xcm_version: Some(SAFE_XCM_VERSION) },
		sudo: SudoConfig { key: Some(root) },
		// Pre-register the key service so encrypted posts work out of
		// the box in dev. Both the X25519 public key and the sr25519
		// account match the keys the OCW derives at runtime (see
		// `pallet_social_feeds::dev_key`).
		social_feeds: SocialFeedsConfig {
			key_service: Some(pallet_social_feeds::types::KeyServiceInfo {
				account: key_service_account,
				encryption_pk: pallet_social_feeds::dev_key::public_key_bytes(),
				version: 1,
			}),
			..Default::default()
		},
	})
}

fn local_testnet_genesis() -> Value {
	testnet_genesis(
		vec![
			(Sr25519Keyring::Alice.to_account_id(), Sr25519Keyring::Alice.public().into()),
			(Sr25519Keyring::Bob.to_account_id(), Sr25519Keyring::Bob.public().into()),
		],
		Sr25519Keyring::well_known().map(|k| k.to_account_id()).collect(),
		Sr25519Keyring::Alice.to_account_id(),
		PARACHAIN_ID.into(),
	)
}

/// Ethereum-flavoured dev accounts (Alith, Baltathar, Charleth) with 0xEE
/// padding to 32 bytes. Kept on the endowed list so historical test
/// fixtures that reference them by name continue to work.
fn eth_dev_accounts() -> Vec<AccountId> {
	use sp_core::crypto::AccountId32;
	[
		// Alith
		hex_literal::hex!("f24ff3a9cf04c71dbc94d0b566f7a27b94566caceeeeeeeeeeeeeeeeeeeeeeee"),
		// Baltathar
		hex_literal::hex!("3cd0a705a2dc65e5b1e1205896baa2be8a07c6e0eeeeeeeeeeeeeeeeeeeeeeee"),
		// Charleth
		hex_literal::hex!("798d4ba9baf0064ec19eb4f0a1a45785ae9d6dfceeeeeeeeeeeeeeeeeeeeeeee"),
	]
	.into_iter()
	.map(AccountId32::from)
	.collect()
}

fn development_config_genesis() -> Value {
	let mut endowed: Vec<AccountId> =
		Sr25519Keyring::well_known().map(|k| k.to_account_id()).collect();
	endowed.extend(eth_dev_accounts());

	// External account: 5G1aK2V7kWbpiikhcj4G8eGFXyJKuwr4qZ67SA1LS1gnxxBy
	endowed.push(sp_core::crypto::AccountId32::from(hex_literal::hex!(
		"ae8dcc076817fa8242467f97d4bc29b5b7f2a0263e4f6739d9e928b231536b5b"
	)));

	testnet_genesis(
		vec![
			(Sr25519Keyring::Alice.to_account_id(), Sr25519Keyring::Alice.public().into()),
			(Sr25519Keyring::Bob.to_account_id(), Sr25519Keyring::Bob.public().into()),
		],
		endowed,
		Sr25519Keyring::Alice.to_account_id(),
		PARACHAIN_ID.into(),
	)
}

/// Provides the JSON representation of predefined genesis config for given `id`.
pub fn get_preset(id: &PresetId) -> Option<vec::Vec<u8>> {
	let patch = match id.as_ref() {
		sp_genesis_builder::LOCAL_TESTNET_RUNTIME_PRESET => local_testnet_genesis(),
		sp_genesis_builder::DEV_RUNTIME_PRESET => development_config_genesis(),
		_ => return None,
	};
	Some(
		serde_json::to_string(&patch)
			.expect("serialization to json is expected to work. qed.")
			.into_bytes(),
	)
}

/// List of supported presets.
pub fn preset_names() -> Vec<PresetId> {
	vec![
		PresetId::from(sp_genesis_builder::DEV_RUNTIME_PRESET),
		PresetId::from(sp_genesis_builder::LOCAL_TESTNET_RUNTIME_PRESET),
	]
}

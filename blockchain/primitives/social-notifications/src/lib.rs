//! # Social Notifications Primitives
//!
//! Shared vocabulary used by the SocialFi pallets to surface real-time
//! notifications through the Substrate Statement Store.
//!
//! The pallets never touch `sp_statement_store` directly — they call
//! [`build_statement`] here, pass the result to [`StatementSubmitter`],
//! and let `pallet-statement`'s offchain worker wrap it in
//! `Proof::OnChain` before gossiping it to the network.
//!
//! ## Topic layout (compatible with `@polkadot-apps/statement-store`)
//!
//! The Parity-published NPM client hashes its `appName` into `topic[0]`
//! as a namespace and uses `topic[1]` (their "`topic2`") for
//! subscriber-side filtering. We mirror that convention exactly:
//!
//! * `topic[0]` — [`APP_TOPIC`]. Constant across every notification
//!   this project emits. Clients construct the same hash via
//!   `createTopic("stack-template-notifications")`.
//! * `topic[1]` — routing key. Recipient-hex for [`NotificationKind::Reply`]
//!   and [`NotificationKind::Follow`]; the literal
//!   `"broadcast/new-app"` for [`NotificationKind::NewApp`]. Both sides
//!   hash the same UTF-8 string so the topic matches byte-for-byte.
//!
//! `topic[2..3]` are left unused — reserved for future expansion if the
//! JS client ever exposes them.
//!
//! ## Payload
//!
//! [`NotificationPayload`] is encoded as **JSON UTF-8** (not SCALE) so
//! `@polkadot-apps/statement-store` can `JSON.parse` it directly in the
//! browser. JSON is verbose compared to SCALE but well within the
//! 512-byte Statement Store limit for our entities.

#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

use alloc::format;
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use codec::Encode;
use sp_statement_store::{Statement, Topic};

/// String hashed into `topic[0]` for every notification. The JS client
/// reaches the same hash via `createTopic("stack-template-notifications")`.
pub const APP_TOPIC_NAME: &str = "stack-template-notifications";

/// `topic[1]` string used for new-app broadcasts. Subscribers call
/// `createTopic("broadcast/new-app")` to receive these.
pub const BROADCAST_NEW_APP_TOPIC_NAME: &str = "broadcast/new-app";

/// Pre-computed hash of [`APP_TOPIC_NAME`]. A runtime-check test
/// (`app_topic_matches_blake2_of_name`) keeps this literal honest.
pub const APP_TOPIC: Topic = [
	0x5d, 0x42, 0x66, 0xf5, 0x95, 0x4d, 0xa5, 0x8f,
	0x3b, 0x4d, 0xe8, 0x88, 0x93, 0xa1, 0x4c, 0x47,
	0xa2, 0x3d, 0x9f, 0xa9, 0x28, 0x06, 0x7d, 0xf9,
	0x35, 0xb2, 0x9a, 0xe6, 0x84, 0x1b, 0xec, 0x38,
];

/// Kinds of notification the SocialFi pallets emit. Serialized into the
/// JSON payload — clients pattern-match on `kind` to render the right
/// UI copy and deep-link.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NotificationKind {
	/// Someone replied to your post.
	Reply,
	/// A new app was registered on the app registry (broadcast).
	NewApp,
	/// Someone followed you.
	Follow,
}

impl NotificationKind {
	/// Stable string tag used as the JSON `"kind"` field. Keeping these
	/// as explicit literals means SCALE index reshuffles in future
	/// variants do not accidentally rename live notifications.
	pub fn tag(&self) -> &'static str {
		match self {
			Self::Reply => "reply",
			Self::NewApp => "new-app",
			Self::Follow => "follow",
		}
	}
}

/// Body of the notification. Serialized as JSON into `Statement::data`.
/// Fields:
/// * `kind` — one of `reply`, `new-app`, `follow`.
/// * `sender_hex` — hex-encoded SCALE bytes of the originator account.
/// * `entity_hex` — hex-encoded SCALE bytes of the relevant id (post id,
///   app id, or follower account).
/// * `block_number` — the source block height, useful for deep-links
///   and ordering.
#[derive(Debug, Eq, PartialEq)]
pub struct NotificationPayload {
	pub kind: NotificationKind,
	pub sender_hex: String,
	pub entity_hex: String,
	pub block_number: u64,
}

impl NotificationPayload {
	/// Serialize to a JSON string. Hand-written (no `serde`) because the
	/// shape is tiny and we want the crate to stay `no_std`-clean without
	/// pulling `serde_json`.
	pub fn to_json(&self) -> String {
		format!(
			"{{\"kind\":\"{}\",\"sender\":\"{}\",\"entity\":\"{}\",\"block\":{}}}",
			self.kind.tag(),
			self.sender_hex,
			self.entity_hex,
			self.block_number,
		)
	}
}

/// Recipient of a notification. `Direct` targets one account; `Broadcast`
/// uses the well-known broadcast topic so any listener can pick it up.
pub enum Recipient<AccountId> {
	Direct(AccountId),
	Broadcast,
}

/// Encode bytes as a lowercase hex string without the `0x` prefix.
/// Enough digits for our `topic[1]` routing key.
fn to_hex(bytes: &[u8]) -> String {
	let mut out = String::with_capacity(bytes.len() * 2);
	for byte in bytes {
		// The `+ b'0'` / `b'a' - 10` trick avoids allocation vs `format!`
		// in a hot path, though this fn runs once per extrinsic so it's
		// not really hot — kept simple for readability.
		let hi = byte >> 4;
		let lo = byte & 0x0f;
		out.push(nibble_to_hex(hi) as char);
		out.push(nibble_to_hex(lo) as char);
	}
	out
}

const fn nibble_to_hex(n: u8) -> u8 {
	match n {
		0..=9 => b'0' + n,
		_ => b'a' + n - 10,
	}
}

/// Hash a UTF-8 string with blake2_256 — mirrors the JS client's
/// `createTopic(name)` so the resulting topic matches byte-for-byte.
pub fn topic_from_name(name: &str) -> Topic {
	sp_io::hashing::blake2_256(name.as_bytes())
}

/// Derive the routing topic (topic[1]) for a recipient. The string
/// fed into `createTopic` on the JS side is the hex-encoded SCALE
/// bytes of the account — no SS58 involved, keeps the hash identical
/// across Rust and TypeScript without dragging ss58 deps into the
/// runtime.
pub fn topic_for_recipient<AccountId: Encode>(recipient: &AccountId) -> Topic {
	let hex = to_hex(&recipient.encode());
	topic_from_name(&hex)
}

/// Build a ready-to-submit Statement carrying a notification.
///
/// The resulting statement has **no proof** — `pallet-statement`'s
/// offchain worker fills in `Proof::OnChain` from the surrounding
/// `NewStatement` event.
pub fn build_statement<AccountId, EntityId>(
	sender: AccountId,
	recipient: &Recipient<AccountId>,
	kind: NotificationKind,
	entity_id: &EntityId,
	block_number: u64,
) -> Statement
where
	AccountId: Encode,
	EntityId: Encode,
{
	let mut statement = Statement::new();

	// topic[0] — app namespace. Every notification carries this so the
	// JS client's `appName = "stack-template-notifications"` filter
	// picks them up on subscribe.
	statement.set_topic(0, APP_TOPIC);

	// topic[1] — routing key. Recipient hex for direct notifications,
	// broadcast constant for new-app.
	let routing_topic = match recipient {
		Recipient::Direct(account) => topic_for_recipient(account),
		Recipient::Broadcast => topic_from_name(BROADCAST_NEW_APP_TOPIC_NAME),
	};
	statement.set_topic(1, routing_topic);

	let payload = NotificationPayload {
		kind,
		sender_hex: to_hex(&sender.encode()),
		entity_hex: to_hex(&entity_id.encode()),
		block_number,
	};
	statement.set_plain_data(payload.to_json().into_bytes());

	statement
}

/// Abstraction over `pallet_statement::Pallet::<T>::submit_statement`.
///
/// Pallets depend on this trait instead of `pallet-statement` directly
/// so their unit tests can plug in a no-op implementation without
/// having to wire the full Statement Store into every mock runtime.
/// The runtime provides the real adapter — see
/// `runtime/src/configs/mod.rs`.
pub trait StatementSubmitter<AccountId> {
	fn submit_statement(account: AccountId, statement: Statement);
}

/// Unit-type fallback that discards every submission. Good enough for
/// mocks that don't care about the notification pipeline.
impl<AccountId> StatementSubmitter<AccountId> for () {
	fn submit_statement(_account: AccountId, _statement: Statement) {}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn app_topic_matches_blake2_of_name() {
		let computed = sp_io::hashing::blake2_256(APP_TOPIC_NAME.as_bytes());
		assert_eq!(
			APP_TOPIC, computed,
			"APP_TOPIC literal is stale — rename produced {computed:02x?}",
		);
	}

	#[test]
	fn to_hex_matches_std_encoding() {
		assert_eq!(to_hex(&[0x00, 0x0a, 0xff]), "000aff".to_string());
		assert_eq!(to_hex(&[]), "".to_string());
	}

	#[test]
	fn topic_for_recipient_is_deterministic() {
		let a: [u8; 32] = [7u8; 32];
		assert_eq!(topic_for_recipient(&a), topic_for_recipient(&a));
	}

	#[test]
	fn topic_for_recipient_differs_by_account() {
		let a: [u8; 32] = [7u8; 32];
		let b: [u8; 32] = [8u8; 32];
		assert_ne!(topic_for_recipient(&a), topic_for_recipient(&b));
	}

	#[test]
	fn topic_for_recipient_matches_js_createtopic() {
		// Lock the Rust ↔ JS contract: hex(account) → blake2_256.
		// The JS side computes `createTopic(hexAccountId)` which must
		// produce the same bytes. If this test changes, the TS client
		// needs to be re-aligned too.
		let account: [u8; 32] = [0xab; 32];
		let expected_input = "ab".repeat(32);
		let expected_topic = sp_io::hashing::blake2_256(expected_input.as_bytes());
		assert_eq!(topic_for_recipient(&account), expected_topic);
	}

	#[test]
	fn build_statement_direct_sets_app_and_recipient_topics() {
		let recipient: [u8; 32] = [1u8; 32];
		let sender: [u8; 32] = [2u8; 32];
		let entity: u64 = 42;
		let statement = build_statement(
			sender,
			&Recipient::Direct(recipient),
			NotificationKind::Reply,
			&entity,
			10,
		);

		assert_eq!(statement.topic(0), Some(APP_TOPIC));
		assert_eq!(statement.topic(1), Some(topic_for_recipient(&recipient)));
		// topic[2] and topic[3] are intentionally unset.
		assert_eq!(statement.topic(2), None);
	}

	#[test]
	fn build_statement_broadcast_uses_constant_topic() {
		let sender: [u8; 32] = [2u8; 32];
		let entity: u32 = 99;
		let statement = build_statement::<[u8; 32], _>(
			sender,
			&Recipient::Broadcast,
			NotificationKind::NewApp,
			&entity,
			10,
		);
		assert_eq!(statement.topic(0), Some(APP_TOPIC));
		assert_eq!(
			statement.topic(1),
			Some(topic_from_name(BROADCAST_NEW_APP_TOPIC_NAME)),
		);
	}

	#[test]
	fn payload_json_shape_is_stable() {
		let payload = NotificationPayload {
			kind: NotificationKind::Follow,
			sender_hex: "aabb".to_string(),
			entity_hex: "ccdd".to_string(),
			block_number: 7,
		};
		assert_eq!(
			payload.to_json(),
			r#"{"kind":"follow","sender":"aabb","entity":"ccdd","block":7}"#.to_string(),
		);
	}

	#[test]
	fn build_statement_emits_json_data() {
		let recipient: [u8; 32] = [3u8; 32];
		let sender: [u8; 32] = [4u8; 32];
		let entity: u64 = 7;
		let statement = build_statement(
			sender,
			&Recipient::Direct(recipient),
			NotificationKind::Follow,
			&entity,
			25,
		);

		let data = statement.data().expect("payload set").clone();
		let json = String::from_utf8(data).expect("valid utf-8");
		assert!(json.contains(r#""kind":"follow""#));
		assert!(json.contains(r#""sender":"04"#));
		assert!(json.contains(r#""block":25"#));
	}
}

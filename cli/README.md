# CLI

`stack-cli`, the Rust command-line tool for interacting with the template chain through:

- [subxt](https://github.com/parity-tech/subxt) for Substrate RPC
- `sp-statement-store` for Statement Store submit / dump

## Run It

From the repo root:

```bash
cargo run -p stack-cli -- --help
```

## Command Groups

- `chain`: `info`, `blocks`, `statement-submit`, `statement-dump`

## Examples

```bash
# Chain info
cargo run -p stack-cli -- chain info

# Stream finalized blocks
cargo run -p stack-cli -- chain blocks

# Statement Store
cargo run -p stack-cli -- chain statement-submit --file ./README.md --signer alice
cargo run -p stack-cli -- chain statement-dump
```

## Signers

The `statement-submit` command accepts dev account names (`alice`, `bob`, `charlie`, `dave`, `eve`, `ferdie`) or any sr25519 SURI string.

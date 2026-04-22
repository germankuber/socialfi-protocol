use clap::{Parser, Subcommand};

mod commands;

#[derive(Parser)]
#[command(name = "stack-cli")]
#[command(about = "CLI for interacting with the Polkadot Stack Template chain")]
struct Cli {
	/// WebSocket RPC endpoint URL
	#[arg(long, env = "SUBSTRATE_RPC_WS", default_value = "ws://127.0.0.1:9944")]
	url: String,

	#[command(subcommand)]
	command: Commands,
}

#[derive(Subcommand)]
enum Commands {
	/// Chain information commands
	Chain {
		#[command(subcommand)]
		action: commands::chain::ChainAction,
	},
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
	let cli = Cli::parse();

	match cli.command {
		Commands::Chain { action } => commands::chain::run(action, &cli.url).await?,
	}

	Ok(())
}

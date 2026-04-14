import { startIndexer } from "./indexer.js";
import { startApi } from "./api.js";

const API_PORT = parseInt(process.env.API_PORT || "3001");

async function main() {
  console.log("=== SocialFi Indexer ===\n");

  // Start block listener
  await startIndexer();

  // Start API server
  startApi(API_PORT);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

import "dotenv/config";
import { ensureSeedPartners } from "../src/lib/seed-partners";

ensureSeedPartners()
  .then(() => console.log("Configured partner accounts are ready."))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Partner account sync failed.");
    process.exitCode = 1;
  });

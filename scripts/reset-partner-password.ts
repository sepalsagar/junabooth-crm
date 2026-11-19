import "dotenv/config";
import { resetPartnerPasswordFromEnv } from "../src/lib/seed-partners";

resetPartnerPasswordFromEnv()
  .then(() => console.log("Partner password reset completed."))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Partner password reset failed.");
    process.exitCode = 1;
  });

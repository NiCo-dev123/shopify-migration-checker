import { runRedirectChecks } from "./src/redirect-checker.js";

runRedirectChecks().catch((error) => {
  console.error("Redirect check failed:", error.message);
  process.exitCode = 1;
});

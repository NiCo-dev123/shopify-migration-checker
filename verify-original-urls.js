import { runOriginalUrlVerification } from "./src/original-url-verifier.js";

runOriginalUrlVerification().catch((error) => {
  console.error("Original URL verification failed:", error.message);
  process.exitCode = 1;
});

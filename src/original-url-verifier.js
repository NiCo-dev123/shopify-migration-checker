import { fileURLToPath } from "node:url";
import { readCsv } from "./csv.js";
import { writeOriginalUrlReport } from "./original-url-report.js";
import { buildUrl } from "./url.js";

const redirectsFile = fileURLToPath(
  new URL("../inputs/redirects.csv", import.meta.url),
);
const domainsFile = fileURLToPath(new URL("../inputs/urls.csv", import.meta.url));

export async function verifyOriginalUrl(
  oldDomain,
  path,
  fetchImplementation = fetch,
) {
  const requestUrl = buildUrl(oldDomain, path);
  const response = await fetchImplementation(requestUrl, { redirect: "manual" });

  return {
    domainName: requestUrl.host,
    path,
    isVerified: response.status >= 200 && response.status < 300,
    statusCode: response.status,
  };
}

function createFailedResult(oldDomain, path) {
  return {
    domainName: buildUrl(oldDomain).host,
    path,
    isVerified: false,
    statusCode: "",
  };
}

function printResult(result) {
  console.log(`${result.domainName}${result.path}`);
  console.log("Verified:", result.isVerified);
  console.log("Status:", result.statusCode || "Request failed");
  console.log("----");
}

export async function runOriginalUrlVerification() {
  const [redirects, domains] = await Promise.all([
    readCsv(redirectsFile),
    readCsv(domainsFile),
  ]);
  const migration = domains[0];

  if (!migration?.old_domain) {
    throw new Error("inputs/urls.csv must contain an old_domain value");
  }

  const results = [];

  for (const redirect of redirects) {
    try {
      const result = await verifyOriginalUrl(
        migration.old_domain,
        redirect.old_url,
      );
      results.push(result);
      printResult(result);
    } catch (error) {
      const result = createFailedResult(migration.old_domain, redirect.old_url);
      results.push(result);
      printResult(result);
      console.error(`Error: ${redirect.old_url}`, error.message);
    }
  }

  const reportPath = await writeOriginalUrlReport(results);
  console.log(`Report written to ${reportPath}`);
  return reportPath;
}

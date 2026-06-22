import { fileURLToPath } from "node:url";
import { readCsv } from "./csv.js";
import { writeOriginalUrlReport } from "./original-url-report.js";
import { buildUrl } from "./url.js";

const redirectsFile = fileURLToPath(
  new URL("../inputs/redirects.csv", import.meta.url),
);
const domainsFile = fileURLToPath(new URL("../inputs/urls.csv", import.meta.url));
const duplicateColumns = ["old_url", "new_url"];

export function detectDuplicateEntries(redirects) {
  const duplicates = [];
  const duplicatedValues = new Map();

  for (const column of duplicateColumns) {
    const counts = new Map();

    for (const redirect of redirects) {
      const value = redirect[column]?.trim();

      if (value) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    const columnDuplicates = new Set();

    for (const [value, count] of counts) {
      if (count > 1) {
        columnDuplicates.add(value);
        duplicates.push({ column, value, count });
      }
    }

    duplicatedValues.set(column, columnDuplicates);
  }

  const entries = redirects.map((redirect) => {
    const hasDuplicate = duplicateColumns.some((column) =>
      duplicatedValues.get(column).has(redirect[column]?.trim()),
    );

    return {
      ...redirect,
      flags: hasDuplicate ? ["double-entry"] : [],
    };
  });

  return { entries, duplicates };
}

export async function verifyOriginalUrl(
  oldDomain,
  path,
  fetchImplementation = fetch,
) {
  const requestUrl = buildUrl(oldDomain, path);
  const response = await fetchImplementation(requestUrl, { redirect: "manual" });
  const statusCode = response.status;
  await response.body?.cancel();

  return {
    domainName: requestUrl.host,
    path,
    isVerified: statusCode >= 200 && statusCode < 300,
    statusCode,
  };
}

function createFailedResult(oldDomain, path, flag) {
  return {
    domainName: buildUrl(oldDomain).host,
    path,
    isVerified: false,
    statusCode: "",
    flag,
  };
}

function printResult(result) {
  console.log(`${result.domainName}${result.path}`);
  console.log("Verified:", result.isVerified);
  console.log("Status:", result.statusCode || "Request failed");
  if (result.flag) {
    console.log("Flag:", result.flag);
  }
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

  const { entries } = detectDuplicateEntries(redirects);
  const results = [];

  for (const redirect of entries) {
    const flag = redirect.flags.join(";");

    try {
      const verification = await verifyOriginalUrl(
        migration.old_domain,
        redirect.old_url,
      );
      const result = { ...verification, flag };
      results.push(result);
      printResult(result);
    } catch (error) {
      const result = createFailedResult(
        migration.old_domain,
        redirect.old_url,
        flag,
      );
      results.push(result);
      printResult(result);
      console.error(`Error: ${redirect.old_url}`, error.message);
    }
  }

  const reportPath = await writeOriginalUrlReport(results);
  console.log(`Report written to ${reportPath}`);
  return reportPath;
}

import { fileURLToPath } from "node:url";
import { readCsv } from "./csv.js";
import { writeRedirectReport } from "./redirect-report.js";

const redirectsFile = fileURLToPath(
  new URL("../inputs/redirects.csv", import.meta.url),
);
const domainsFile = fileURLToPath(new URL("../inputs/urls.csv", import.meta.url));

function toUrl(domain, path = "") {
  const baseUrl = /^https?:\/\//u.test(domain) ? domain : `https://${domain}`;
  return new URL(path, `${baseUrl.replace(/\/$/u, "")}/`);
}

function resolveRedirectTarget(location, expectedUrl) {
  if (!location) {
    return null;
  }

  return toUrl(expectedUrl.origin, location);
}

function urlsMatch(actualUrl, expectedUrl) {
  return (
    actualUrl?.origin === expectedUrl.origin &&
    actualUrl.pathname === expectedUrl.pathname &&
    actualUrl.search === expectedUrl.search
  );
}

export async function checkRedirect(
  oldDomain,
  newDomain,
  redirect,
  fetchImplementation = fetch,
) {
  const requestUrl = toUrl(oldDomain, redirect.old_url);
  const expectedUrl = toUrl(newDomain, redirect.new_url);
  const response = await fetchImplementation(requestUrl, { redirect: "manual" });
  const actualUrl = resolveRedirectTarget(
    response.headers.get("location"),
    expectedUrl,
  );

  return {
    oldUrl: requestUrl.href,
    newUrl: expectedUrl.href,
    actualUrl: actualUrl?.href ?? "",
    isMatch: urlsMatch(actualUrl, expectedUrl),
    hasRedirect: response.status === 301,
    statusCode: response.status,
  };
}

function printResult(result) {
  console.log(result.oldUrl);
  console.log("Expected:", result.newUrl);
  console.log("Actual:", result.actualUrl || "Missing");
  console.log("Status:", result.statusCode || "Request failed");
  console.log("Match:", result.isMatch);
  console.log("----");
}

function createFailedResult(oldDomain, newDomain, redirect) {
  return {
    oldUrl: toUrl(oldDomain, redirect.old_url).href,
    newUrl: toUrl(newDomain, redirect.new_url).href,
    actualUrl: "",
    isMatch: false,
    hasRedirect: false,
    statusCode: "",
  };
}

export async function runRedirectChecks() {
  const [redirects, domains] = await Promise.all([
    readCsv(redirectsFile),
    readCsv(domainsFile),
  ]);
  const migration = domains[0];

  if (!migration?.old_domain || !migration.new_domain) {
    throw new Error(
      "inputs/urls.csv must contain old_domain and new_domain values",
    );
  }

  const results = [];

  for (const redirect of redirects) {
    try {
      const result = await checkRedirect(
        migration.old_domain,
        migration.new_domain,
        redirect,
      );
      results.push(result);
      printResult(result);
    } catch (error) {
      results.push(
        createFailedResult(
          migration.old_domain,
          migration.new_domain,
          redirect,
        ),
      );
      console.error(`Error: ${redirect.old_url}`, error.message);
    }
  }

  const reportPath = await writeRedirectReport(results);
  console.log(`Report written to ${reportPath}`);
  return reportPath;
}

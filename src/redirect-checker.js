import { fileURLToPath } from "node:url";
import { readCsv } from "./csv.js";

const redirectsFile = fileURLToPath(
  new URL("../inputs/redirects.csv", import.meta.url),
);
const domainsFile = fileURLToPath(new URL("../inputs/urls.csv", import.meta.url));

function toUrl(domain, path = "") {
  const baseUrl = /^https?:\/\//u.test(domain) ? domain : `https://${domain}`;
  return new URL(path, `${baseUrl.replace(/\/$/u, "")}/`);
}

export async function checkRedirect(oldDomain, redirect) {
  const requestUrl = toUrl(oldDomain, redirect.old_url);
  const response = await fetch(requestUrl, { redirect: "manual" });

  return {
    oldPath: redirect.old_url,
    expectedPath: redirect.new_url,
    status: response.status,
    location: response.headers.get("location"),
  };
}

function printResult(result) {
  console.log(result.oldPath);
  console.log("Expected:", result.expectedPath);
  console.log("Status:", result.status);
  console.log("Location:", result.location ?? "Missing");
  console.log("----");
}

export async function runRedirectChecks() {
  const [redirects, domains] = await Promise.all([
    readCsv(redirectsFile),
    readCsv(domainsFile),
  ]);
  const migration = domains[0];

  if (!migration?.old_domain) {
    throw new Error("inputs/urls.csv must contain an old_domain value");
  }

  for (const redirect of redirects) {
    try {
      const result = await checkRedirect(migration.old_domain, redirect);
      printResult(result);
    } catch (error) {
      console.error(`Error: ${redirect.old_url}`, error.message);
    }
  }
}

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { checkRedirect } from "../src/redirect-checker.js";
import {
  writeRedirectReport,
} from "../src/redirect-report.js";
import { formatReportTimestamp } from "../src/report.js";

function response(status, location) {
  return new Response(null, {
    status,
    headers: location ? { location } : {},
  });
}

test("matches a relative 301 redirect against the destination domain", async () => {
  const result = await checkRedirect(
    "new.example",
    { old_url: "/old", new_url: "/new?source=test" },
    async () => response(301, "/new?source=test"),
  );

  assert.equal(result.hasRedirect, true);
  assert.equal(result.isMatch, true);
  assert.equal(result.statusCode, 301);
  assert.equal(result.oldUrl, "https://new.example/old");
  assert.equal(result.actualUrl, "https://new.example/new?source=test");
});

test("rejects a redirect to the wrong absolute domain", async () => {
  const result = await checkRedirect(
    "new.example",
    { old_url: "/old", new_url: "/new" },
    async () => response(301, "https://wrong.example/new"),
  );

  assert.equal(result.hasRedirect, true);
  assert.equal(result.isMatch, false);
});

test("only a 301 response sets hasRedirect to true", async () => {
  const result = await checkRedirect(
    "new.example",
    { old_url: "/old", new_url: "/new" },
    async () => response(302, "/new"),
  );

  assert.equal(result.hasRedirect, false);
  assert.equal(result.statusCode, 302);
});

test("releases the redirect response body", async () => {
  const response = new Response("redirecting", {
    status: 301,
    headers: { location: "/new" },
  });

  await checkRedirect(
    "new.example",
    { old_url: "/old", new_url: "/new" },
    async () => response,
  );

  assert.equal(response.bodyUsed, true);
});

test("sends an authenticated storefront cookie with redirect checks", async () => {
  let requestOptions;

  await checkRedirect(
    "new.example",
    { old_url: "/old", new_url: "/new" },
    async (_url, options) => {
      requestOptions = options;
      return response(301, "/new");
    },
    "storefront_digest=authenticated",
  );

  assert.equal(
    requestOptions.headers.cookie,
    "storefront_digest=authenticated",
  );
});

test("writes a timestamped redirect report", async (context) => {
  const date = new Date(2026, 5, 22, 14, 7);
  const reportPath = await writeRedirectReport(
    [
      {
        oldUrl: "https://old.example/old",
        newUrl: "https://new.example/new",
        actualUrl: "https://new.example/new",
        isMatch: true,
        hasRedirect: true,
        statusCode: 301,
      },
    ],
    date,
  );
  context.after(() => rm(reportPath, { force: true }));

  assert.equal(formatReportTimestamp(date), "260622-1407");
  assert.match(reportPath, /verified-redirects-260622-1407\.csv$/u);
  assert.equal(
    await readFile(reportPath, "utf8"),
    "old_url,new_url,actual_url,is_match,has_redirect,status_code\n" +
      "https://old.example/old,https://new.example/new,https://new.example/new,true,true,301\n",
  );
});

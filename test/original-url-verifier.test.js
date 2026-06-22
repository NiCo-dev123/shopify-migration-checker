import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { writeOriginalUrlReport } from "../src/original-url-report.js";
import {
  detectDuplicateEntries,
  verifyOriginalUrl,
} from "../src/original-url-verifier.js";

test("flags every row affected by duplicate old or new URLs", () => {
  const { entries, duplicates } = detectDuplicateEntries([
    { old_url: "/same", new_url: "/destination" },
    { old_url: " /same ", new_url: "/other" },
    { old_url: "/unique", new_url: "/destination" },
    { old_url: "/same/", new_url: "" },
    { old_url: "/SAME", new_url: "" },
  ]);

  assert.deepEqual(
    entries.map(({ flags }) => flags),
    [["double-entry"], ["double-entry"], ["double-entry"], [], []],
  );
  assert.deepEqual(duplicates, [
    { column: "old_url", value: "/same", count: 2 },
    { column: "new_url", value: "/destination", count: 2 },
  ]);
});

test("marks only 2xx original URL responses as verified", async () => {
  for (const [status, expected] of [
    [200, true],
    [204, true],
    [301, false],
    [404, false],
    [500, false],
  ]) {
    const result = await verifyOriginalUrl(
      "old.example",
      "/original",
      async () => new Response(null, { status }),
    );

    assert.equal(result.isVerified, expected);
    assert.equal(result.statusCode, status);
    assert.equal(result.domainName, "old.example");
    assert.equal(result.path, "/original");
  }
});

test("does not follow redirects while verifying an original URL", async () => {
  let redirectMode;

  await verifyOriginalUrl("old.example", "/original", async (_url, options) => {
    redirectMode = options.redirect;
    return new Response(null, { status: 301 });
  });

  assert.equal(redirectMode, "manual");
});

test("releases the original URL response body", async () => {
  const response = new Response("page content", { status: 200 });

  await verifyOriginalUrl("old.example", "/original", async () => response);

  assert.equal(response.bodyUsed, true);
});

test("retries fetch failures up to three total attempts", async () => {
  let attempts = 0;

  const result = await verifyOriginalUrl("old.example", "/original", async () => {
    attempts += 1;

    if (attempts < 3) {
      throw new TypeError("fetch failed");
    }

    return new Response(null, { status: 200 });
  });

  assert.equal(attempts, 3);
  assert.equal(result.isVerified, true);
  assert.equal(result.statusCode, 200);
});

test("reports timeout after all fetch attempts fail", async () => {
  let attempts = 0;
  const fetchError = new TypeError("fetch failed", {
    cause: Object.assign(new Error("socket closed"), { code: "UND_ERR_SOCKET" }),
  });

  const result = await verifyOriginalUrl("old.example", "/original", async () => {
    attempts += 1;
    throw fetchError;
  });

  assert.equal(attempts, 3);
  assert.equal(result.isVerified, false);
  assert.equal(result.statusCode, "timeout");
  assert.equal(
    result.errorMessage,
    "fetch failed (UND_ERR_SOCKET: socket closed)",
  );
});

test("does not retry HTTP error responses", async () => {
  let attempts = 0;

  const result = await verifyOriginalUrl("old.example", "/missing", async () => {
    attempts += 1;
    return new Response(null, { status: 404 });
  });

  assert.equal(attempts, 1);
  assert.equal(result.isVerified, false);
  assert.equal(result.statusCode, 404);
});

test("writes a timestamped original URL report", async (context) => {
  const date = new Date(2026, 5, 22, 18, 5);
  const reportPath = await writeOriginalUrlReport(
    [
      {
        domainName: "old.example",
        path: "/original",
        isVerified: true,
        statusCode: 200,
        flag: "double-entry",
      },
    ],
    date,
  );
  context.after(() => rm(reportPath, { force: true }));

  assert.match(reportPath, /verified-urls-260622-1805\.csv$/u);
  assert.equal(
    await readFile(reportPath, "utf8"),
    "domain_name,path,is_verified,status_code,flag\n" +
      "old.example,/original,true,200,double-entry\n",
  );
});

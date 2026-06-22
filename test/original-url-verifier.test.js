import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { writeOriginalUrlReport } from "../src/original-url-report.js";
import { verifyOriginalUrl } from "../src/original-url-verifier.js";

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

test("writes a timestamped original URL report", async (context) => {
  const date = new Date(2026, 5, 22, 18, 5);
  const reportPath = await writeOriginalUrlReport(
    [
      {
        domainName: "old.example",
        path: "/original",
        isVerified: true,
        statusCode: 200,
      },
    ],
    date,
  );
  context.after(() => rm(reportPath, { force: true }));

  assert.match(reportPath, /verified-urls-260622-1805\.csv$/u);
  assert.equal(
    await readFile(reportPath, "utf8"),
    "domain_name,path,is_verified,status_code\nold.example,/original,true,200\n",
  );
});

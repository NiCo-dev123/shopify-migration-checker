import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateShopifyStorefront,
  extractAuthenticityToken,
} from "../src/shopify-storefront-auth.js";

const passwordPageHtml = `
  <form action="/password" method="post">
    <input type="hidden" name="authenticity_token" value="token&amp;value">
    <input type="password" name="password">
  </form>
`;

test("extracts and decodes Shopify's authenticity token", () => {
  assert.equal(extractAuthenticityToken(passwordPageHtml), "token&value");
});

test("exchanges a storefront password for cookies", async () => {
  const requests = [];
  const responses = [
    new Response(passwordPageHtml, {
      status: 200,
      headers: { "set-cookie": "session=initial; Path=/; HttpOnly" },
    }),
    new Response(null, {
      status: 302,
      headers: {
        location: "/",
        "set-cookie": "storefront_digest=authenticated; Path=/; HttpOnly",
      },
    }),
    new Response("storefront", { status: 200 }),
  ];

  const cookie = await authenticateShopifyStorefront(
    "shop.example",
    "secret",
    async (url, options) => {
      requests.push({ url: url.href, options });
      return responses.shift();
    },
  );

  assert.match(cookie, /session=initial/u);
  assert.match(cookie, /storefront_digest=authenticated/u);
  assert.equal(requests[1].options.method, "POST");
  assert.equal(requests[1].options.body.get("authenticity_token"), "token&value");
  assert.equal(requests[1].options.body.get("password"), "secret");
  assert.match(requests[2].options.headers.cookie, /storefront_digest/u);
});

test("rejects an invalid storefront password", async () => {
  const responses = [
    new Response(passwordPageHtml, { status: 200 }),
    new Response(null, { status: 200 }),
    new Response(null, {
      status: 302,
      headers: { location: "/password" },
    }),
  ];

  await assert.rejects(
    authenticateShopifyStorefront(
      "shop.example",
      "wrong-password",
      async () => responses.shift(),
    ),
    /password was rejected/u,
  );
});

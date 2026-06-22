import { buildUrl } from "./url.js";

function splitSetCookieHeader(header) {
  return header.split(/,(?=\s*[^;,=\s]+=)/u);
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const header = headers.get("set-cookie");
  return header ? splitSetCookieHeader(header) : [];
}

function addResponseCookies(cookieJar, response) {
  for (const setCookie of getSetCookieHeaders(response.headers)) {
    const [cookie] = setCookie.split(";", 1);
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex > 0) {
      cookieJar.set(
        cookie.slice(0, separatorIndex).trim(),
        cookie.slice(separatorIndex + 1).trim(),
      );
    }
  }
}

function serializeCookies(cookieJar) {
  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function extractAuthenticityToken(html) {
  const input = html.match(
    /<input\b[^>]*\bname=["']authenticity_token["'][^>]*>/iu,
  )?.[0];
  const token = input?.match(/\bvalue=["']([^"']*)["']/iu)?.[1];

  if (!token) {
    throw new Error("Shopify password page has no authenticity token");
  }

  return decodeHtmlAttribute(token);
}

export async function authenticateShopifyStorefront(
  domain,
  password,
  fetchImplementation = fetch,
) {
  const passwordUrl = buildUrl(domain, "/password");
  const cookieJar = new Map();
  const passwordPage = await fetchImplementation(passwordUrl, {
    redirect: "manual",
  });
  addResponseCookies(cookieJar, passwordPage);

  if (!passwordPage.ok) {
    await passwordPage.body?.cancel();
    throw new Error(
      `Unable to load Shopify password page (${passwordPage.status})`,
    );
  }

  const authenticityToken = extractAuthenticityToken(
    await passwordPage.text(),
  );
  const form = new URLSearchParams({
    authenticity_token: authenticityToken,
    password,
  });
  const passwordResponse = await fetchImplementation(passwordUrl, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: serializeCookies(cookieJar),
    },
    body: form,
  });
  addResponseCookies(cookieJar, passwordResponse);
  await passwordResponse.body?.cancel();

  const cookie = serializeCookies(cookieJar);
  const verificationResponse = await fetchImplementation(buildUrl(domain), {
    redirect: "manual",
    headers: { cookie },
  });
  const location = verificationResponse.headers.get("location");
  const returnsToPassword =
    location &&
    buildUrl(domain, location).pathname.replace(/\/$/u, "") === "/password";
  await verificationResponse.body?.cancel();

  if (returnsToPassword) {
    throw new Error("Shopify storefront password was rejected");
  }

  return cookie;
}

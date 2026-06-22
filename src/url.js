export function buildUrl(domain, path = "") {
  const baseUrl = /^https?:\/\//u.test(domain) ? domain : `https://${domain}`;
  return new URL(path, `${baseUrl.replace(/\/$/u, "")}/`);
}

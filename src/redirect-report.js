import { fileURLToPath } from "node:url";
import { writeCsv } from "./csv.js";

const reportsDirectory = fileURLToPath(new URL("../reports/", import.meta.url));

const reportColumns = [
  { key: "oldUrl", header: "old_url" },
  { key: "newUrl", header: "new_url" },
  { key: "actualUrl", header: "actual_url" },
  { key: "isMatch", header: "is_match" },
  { key: "hasRedirect", header: "has_redirect" },
  { key: "statusCode", header: "status_code" },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatReportTimestamp(date = new Date()) {
  return [
    String(date.getFullYear()).slice(-2),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

export async function writeRedirectReport(results, date = new Date()) {
  const filename = `verified-redirects-${formatReportTimestamp(date)}.csv`;
  const reportUrl = new URL(filename, `file://${reportsDirectory}/`);
  const reportPath = fileURLToPath(reportUrl);

  await writeCsv(reportPath, results, reportColumns);
  return reportPath;
}

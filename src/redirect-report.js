import { writeCsv } from "./csv.js";
import { createReportPath } from "./report.js";

const reportColumns = [
  { key: "oldUrl", header: "old_url" },
  { key: "newUrl", header: "new_url" },
  { key: "actualUrl", header: "actual_url" },
  { key: "isMatch", header: "is_match" },
  { key: "hasRedirect", header: "has_redirect" },
  { key: "statusCode", header: "status_code" },
];

export async function writeRedirectReport(results, date = new Date()) {
  const reportPath = createReportPath("verified-redirects", date);

  await writeCsv(reportPath, results, reportColumns);
  return reportPath;
}

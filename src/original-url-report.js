import { writeCsv } from "./csv.js";
import { createReportPath } from "./report.js";

const reportColumns = [
  { key: "domainName", header: "domain_name" },
  { key: "path", header: "path" },
  { key: "isVerified", header: "is_verified" },
  { key: "statusCode", header: "status_code" },
  { key: "flag", header: "flag" },
];

export async function writeOriginalUrlReport(results, date = new Date()) {
  const reportPath = createReportPath("verified-urls", date);

  await writeCsv(reportPath, results, reportColumns);
  return reportPath;
}

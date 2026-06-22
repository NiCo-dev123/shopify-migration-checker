import { join } from "node:path";
import { fileURLToPath } from "node:url";

const reportsDirectory = fileURLToPath(new URL("../reports/", import.meta.url));

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

export function createReportPath(prefix, date = new Date()) {
  return join(
    reportsDirectory,
    `${prefix}-${formatReportTimestamp(date)}.csv`,
  );
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const redirectsFile = "inputs/redirects.csv";
const reportsFolder = "reports";

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"' && isQuoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

async function readCsv(filePath) {
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/u).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function escapeCsvValue(value) {
  if (!/[",\r\n]/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function getDiffName(extractedFile) {
  const filename = basename(extractedFile, ".csv");
  return filename.replace(/^extracted-/u, "");
}

function getOutputPath(extractedFile) {
  return join(reportsFolder, `url-diff-${getDiffName(extractedFile)}.csv`);
}

async function writeMissingUrls(filePath, rows) {
  const csvLines = [
    "missing_url",
    ...rows.map((row) => escapeCsvValue(row.missing_url)),
  ];

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${csvLines.join("\n")}\n`, "utf8");
}

async function checkDiff(extractedFile) {
  const [extractedUrls, redirects] = await Promise.all([
    readCsv(extractedFile),
    readCsv(redirectsFile),
  ]);
  const redirectPaths = new Set(redirects.map((redirect) => redirect.old_url));
  const missingUrls = extractedUrls
    .map((row) => row.old_url)
    .filter((url) => url && !redirectPaths.has(url))
    .map((url) => ({ missing_url: url }));
  const outputPath = getOutputPath(extractedFile);

  await writeMissingUrls(outputPath, missingUrls);

  return { outputPath, count: missingUrls.length };
}

const extractedFile = process.argv[2];

if (!extractedFile) {
  console.error("Usage: node tools/check-diff.js reports/extracted-sitemap.csv");
  process.exitCode = 1;
} else {
  try {
    const { outputPath, count } = await checkDiff(extractedFile);
    console.log(`Found ${count} missing URLs in ${outputPath}`);
  } catch (error) {
    console.error(`URL diff failed: ${error.message}`);
    process.exitCode = 1;
  }
}

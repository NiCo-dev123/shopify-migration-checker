import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

const reportsFolder = "reports";

function escapeCsvValue(value) {
  if (!/[",\r\n]/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function extractLocValues(xmlContent) {
  const locTagPattern = /<loc>\s*([^<]+?)\s*<\/loc>/giu;
  const values = [];

  for (const match of xmlContent.matchAll(locTagPattern)) {
    values.push(match[1].trim());
  }

  return values;
}

function extractPath(urlValue) {
  const url = new URL(urlValue);

  // Only return pathname and search, hash is not needed for this project
  return `${url.pathname}${url.search}`;
}

function getOutputPath(inputPath) {
  const extension = extname(inputPath);
  const filename = basename(inputPath, extension);

  return join(reportsFolder, `extracted-${filename}.csv`);
}

async function extractUrls(inputPath) {
  const xmlContent = await readFile(inputPath, "utf8");
  const urls = extractLocValues(xmlContent);
  const rows = urls.map((url) => ({ old_url: extractPath(url) }));
  const outputPath = getOutputPath(inputPath);
  const csvLines = [
    "old_url",
    ...rows.map((row) => escapeCsvValue(row.old_url)),
  ];

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${csvLines.join("\n")}\n`, "utf8");

  return { outputPath, count: rows.length };
}

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node tools/extract-urls.js path/to/sitemap.xml");
  process.exitCode = 1;
} else {
  try {
    const { outputPath, count } = await extractUrls(inputPath);
    console.log(`Extracted ${count} URLs to ${outputPath}`);
  } catch (error) {
    console.error(`URL extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}

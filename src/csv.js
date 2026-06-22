import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function parseLine(line) {
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

export async function readCsv(filePath) {
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/u).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const headers = parseLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

function escapeValue(value) {
  const stringValue = String(value ?? "");

  if (!/[",\r\n]/u.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.map(({ header }) => escapeValue(header)).join(","),
    ...rows.map((row) =>
      columns.map(({ key }) => escapeValue(row[key])).join(","),
    ),
  ];

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

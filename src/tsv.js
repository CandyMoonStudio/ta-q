import fs from "node:fs";

export function readTsv(path) {
  const content = fs.readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const header = lines[0].split("\t");

  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    const record = {};

    header.forEach((key, index) => {
      record[key] = values[index] ?? "";
    });

    return record;
  });
}

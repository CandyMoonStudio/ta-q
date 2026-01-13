import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readTsv } from "./tsv.js";
import { validateQuestion } from "./checks.js";
import { computeWeight } from "./weight.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const inputPath = path.join(rootDir, "questions_edit.tsv");
const outDir = path.join(rootDir, "out");

const rows = readTsv(inputPath);
const prod = [];
const ng = [];
const errorCounts = new Map();

function trackErrors(errors) {
  errors.forEach((code) => {
    errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
  });
}

rows.forEach((row, index) => {
  const result = validateQuestion(row, index);
  const question = result.normalizedQuestion;
  const errors = [...result.errors];

  question.weight = computeWeight(question);

  if (question.status !== "prod") {
    errors.push("status_not_prod");
  }

  const output = {
    id: question.id,
    text: question.text,
    answer: question.answer,
    aliases: question.aliases,
    tags: question.tags,
    weight: question.weight,
    status: question.status,
    source: question.source,
    _index: question._index,
  };

  if (errors.length > 0) {
    output.errors = errors;
    ng.push(output);
    trackErrors(errors);
  } else {
    prod.push(output);
  }
});

const stableSort = (items) =>
  items.sort((a, b) => {
    const idCompare = a.id.localeCompare(b.id, "en");
    if (idCompare !== 0) {
      return idCompare;
    }
    return a._index - b._index;
  });

stableSort(prod);
stableSort(ng);

const stripIndex = (item) => {
  const { _index, ...rest } = item;
  if (rest.aliases === undefined) {
    delete rest.aliases;
  }
  if (rest.tags === undefined) {
    delete rest.tags;
  }
  if (rest.source === undefined) {
    delete rest.source;
  }
  return rest;
};

const prodOutput = prod.map(stripIndex);
const ngOutput = ng.map(stripIndex);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "questions_prod.json"),
  `${JSON.stringify(prodOutput, null, 2)}\n`,
  "utf8"
);
fs.writeFileSync(
  path.join(outDir, "questions_ng.json"),
  `${JSON.stringify(ngOutput, null, 2)}\n`,
  "utf8"
);

const total = rows.length;
const prodCount = prodOutput.length;
const ngCount = ngOutput.length;

const reportLines = [
  `total\t${total}`,
  `prod\t${prodCount}`,
  `ng\t${ngCount}`,
  "",
  "errors",
];

[...errorCounts.entries()]
  .sort((a, b) => a[0].localeCompare(b[0], "en"))
  .forEach(([code, count]) => {
    reportLines.push(`${code}\t${count}`);
  });

fs.writeFileSync(path.join(outDir, "report.txt"), `${reportLines.join("\n")}\n`, "utf8");

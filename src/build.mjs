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
    id: /^\d+$/.test(question.id) ? Number(question.id) : question.id,
    type: question.type,
    question: question.text,
    romaji_typing: question.romaji,
    answer_variants: [question.answer, ...(question.aliases || [])],
    answer_display: question.answer_display || question.answer, // Fallback to raw answer if display not set
    answer: question.answer_display || question.answer, // Typeanswer expects 'answer' to be the display one? No, wait.
    // In typeanswer/data/questions_prod.json:
    // "answer_display": "東京",
    // "answer": "東京",
    // It seems 'answer' is often same as 'answer_display'.
    // BUT 'answer_variants' contains the typing logic targets.
    // Let's check typeanswer data again.
    // id: 1
    // question: "日本の首都は？"
    // romaji_typing: "nihon no shuto ha ?"
    // answer_variants: ["tokyo", "toukyou"]
    // answer_display: "東京"
    // answer: "東京"

    // So 'answer' in JSON output is display text.
    // In TA-Question-Gen, 'question.answer' is the PRIMARY typing key (e.g. 'tokyo').
    // So we need to map:
    // JSON.answer -> question.answer_display (or question.answer if display missing? No, question.answer is 'tokyo' usually)
    // Actually looking at row 2 in TSV: text: "1足す1は？" answer: "2" aliases: "ni|two"
    // Here 'answer' is '2', which is displayable.
    // But row 1: text: "日本の首都は？" answer: "tokyo" aliases: "toukyou"
    // Here 'answer' is 'tokyo', NOT displayable "東京".
    // So we MUST use answer_display for JSON.answer and JSON.answer_display.

    answer: question.answer_display,
    reading: question.reading,
    explanation: question.explanation,

    // Internal fields for processing/debugging
    _index: question._index,
    status: question.status,
    tags: question.tags,
    source: question.source,
    weight: question.weight,
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
    const idA = String(a.id);
    const idB = String(b.id);
    // Use numeric: true for natural sort order (1, 2, 10 instead of 1, 10, 2)
    const idCompare = idA.localeCompare(idB, "en", { numeric: true });
    if (idCompare !== 0) {
      return idCompare;
    }
    return a._index - b._index;
  });

stableSort(prod);
stableSort(ng);

const formatOutput = (item) => {
  const {
    _index, status, tags, source, weight,
    ...rest
  } = item;

  if (!rest.explanation) delete rest.explanation;

  // Clean up potentially undefined fields
  Object.keys(rest).forEach(key => {
    if (rest[key] === undefined) {
      delete rest[key];
    }
  });

  return rest;
};

const prodOutput = prod.map(formatOutput);
const ngOutput = ng.map(formatOutput);

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

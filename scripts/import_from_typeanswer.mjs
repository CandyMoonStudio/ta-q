
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const typeAnswerDataDir = path.resolve(rootDir, "../typeanswer/data");
const outPath = path.join(rootDir, "questions_edit.tsv");

const prodPath = path.join(typeAnswerDataDir, "questions_prod.json");
const ngPath = path.join(typeAnswerDataDir, "questions_ng.json");

function loadJson(p) {
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const prodData = loadJson(prodPath);
const ngData = loadJson(ngPath);

const rows = [];

// Header
const headers = [
  "id",
  "text",
  "answer",
  "aliases",
  "romaji",
  "type",
  "tags", // We can map category to tags for NG items
  "weight",
  "status",
  "source",
  "explanation"
];

rows.push(headers.join("\t"));

function processItem(item, status) {
  const id = item.id;
  const text = item.question || "";
  
  // answer_variants -> answer, aliases
  const variants = item.answer_variants || [];
  const answer = variants.length > 0 ? variants[0] : "";
  const aliases = variants.length > 1 ? variants.slice(1).join("|") : "";
  
  const romaji = item.romaji_typing || "";
  const type_ = item.type || ""; // 'type' is reserved keyword? no
  
  // For NG items, category -> tags?
  let tags = [];
  if (item.category) {
    tags.push(item.category);
  }
  if (item.tags) {
     if (Array.isArray(item.tags)) tags.push(...item.tags); // should not happen based on current schema but safe to handle
  }
  const tagsStr = tags.join("|");

  const weight = item.weight || "";
  const source = "import";
  const explanation = item.explanation || "";

  // For NG items with ng_reason, append to explanation?
  let expl = explanation;
  if (item.ng_reason) {
    expl = expl ? `${expl} (NG Reason: ${item.ng_reason})` : `NG Reason: ${item.ng_reason}`;
  }

  return [
    id,
    text,
    answer,
    aliases,
    romaji,
    type_,
    tagsStr,
    weight,
    status,
    source,
    expl
  ].map(v => String(v).replace(/\t/g, " ")).join("\t"); // Basic escaping of tabs
}

prodData.forEach(item => {
  rows.push(processItem(item, "prod"));
});

ngData.forEach(item => {
  rows.push(processItem(item, "ng"));
});

fs.writeFileSync(outPath, rows.join("\n") + "\n", "utf8");
console.log(`Imported ${prodData.length} prod and ${ngData.length} ng items to ${outPath}`);

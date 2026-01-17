import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../');

const TYPEANSWER_DATA_DIR = path.resolve(ROOT_DIR, '../typeanswer/data');
const OUT_PATH = path.join(ROOT_DIR, 'questions_edit.tsv');

// Schema Definition for TSV Columns
const HEADERS = [
    "id",
    "text",
    "answer",
    "aliases",
    "romaji",
    "type",
    "tags",
    "weight",
    "status",
    "source",
    "explanation",
    // Optional/New columns support
    "answer_display",
    "reading"
];

interface QuestionItem {
    id: string;
    question?: string;
    answer_variants?: string[];
    romaji_typing?: string;
    type?: string;
    category?: string;
    tags?: string[];
    weight?: number;
    explanation?: string;
    ng_reason?: string;
    answer_display?: string;
    reading?: string;
}

function loadJson(p: string): QuestionItem[] {
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

function processItem(item: QuestionItem, status: string): string[] {
    const id = item.id;
    const text = item.question || "";

    // answer_variants -> answer, aliases
    const variants = item.answer_variants || [];
    const answer = variants.length > 0 ? variants[0] : "";
    const aliases = variants.length > 1 ? variants.slice(1).join("|") : "";

    const romaji = item.romaji_typing || "";
    const type_ = item.type || "";

    let tags: string[] = [];
    if (item.category) tags.push(item.category);
    if (Array.isArray(item.tags)) tags.push(...item.tags);
    const tagsStr = tags.join("|");

    const weight = item.weight !== undefined ? String(item.weight) : "";
    const source = "import";

    let expl = item.explanation || "";
    if (item.ng_reason) {
        expl = expl ? `${expl} (NG Reason: ${item.ng_reason})` : `NG Reason: ${item.ng_reason}`;
    }

    const answer_display = item.answer_display || "";
    const reading = item.reading || "";

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
        expl,
        answer_display,
        reading
    ].map(v => String(v).replace(/\t/g, " ").replace(/\n/g, " ")); // Escape tabs and newlines
}

function main() {
    console.log(`Importing from: ${TYPEANSWER_DATA_DIR}`);

    const prodPath = path.join(TYPEANSWER_DATA_DIR, "questions_prod.json");
    const ngPath = path.join(TYPEANSWER_DATA_DIR, "questions_ng.json");

    if (!fs.existsSync(prodPath)) {
        console.error(`Error: Data directory not found at ${TYPEANSWER_DATA_DIR}`);
        process.exit(1);
    }

    const prodData = loadJson(prodPath);
    const ngData = loadJson(ngPath);

    const rows: string[] = [];
    rows.push(HEADERS.join("\t"));

    prodData.forEach(item => {
        rows.push(processItem(item, "prod").join("\t"));
    });

    ngData.forEach(item => {
        rows.push(processItem(item, "ng").join("\t"));
    });

    fs.writeFileSync(OUT_PATH, rows.join("\n") + "\n", "utf8");
    console.log(`Imported ${prodData.length} prod and ${ngData.length} ng items to ${OUT_PATH}`);
}

main();

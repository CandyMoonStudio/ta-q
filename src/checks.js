import { normalize } from "./normalize.js";

const seenIds = new Set();
const seenTextAnswer = new Set();

function splitPipe(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function validateQuestion(question, index) {
  const errors = [];
  const id = String(question.id || "").trim();
  const text = String(question.text || "").trim();
  const answer = String(question.answer || "").trim();
  const normalizedAnswer = normalize(answer);

  if (!id) {
    errors.push("missing_id");
  }
  if (!text) {
    errors.push("missing_text");
  }
  if (!answer) {
    errors.push("missing_answer");
  }
  if (!normalizedAnswer) {
    errors.push("normalized_answer_empty");
  }

  if (id) {
    if (seenIds.has(id)) {
      errors.push("dup_id");
    }
    seenIds.add(id);
  }

  if (text && answer) {
    const key = `${text}\u0000${answer}`;
    if (seenTextAnswer.has(key)) {
      errors.push("dup_text_answer");
    }
    seenTextAnswer.add(key);
  }

  const aliases = splitPipe(question.aliases);
  const tags = splitPipe(question.tags);
  const status = String(question.status || "").trim();

  const source = String(question.source || "").trim();
  const romaji = String(question.romaji || "").trim();
  const typeValue = String(question.type || "").trim();
  const explanation = String(question.explanation || "").trim();

  const normalizedQuestion = {
    id,
    text,
    answer,
    aliases: aliases.length > 0 ? aliases : undefined,
    tags: tags.length > 0 ? tags : undefined,
    status: status || "inbox",

    source: source || undefined,
    romaji: romaji || undefined,
    type: typeValue || undefined,
    explanation: explanation || undefined,
    _index: index,
  };

  return {
    ok: errors.length === 0,
    errors,
    normalizedQuestion,
  };
}

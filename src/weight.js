import { normalize } from "./normalize.js";

export function computeWeight(question) {
  const normalizedAnswer = normalize(question.answer || "");
  const base = normalizedAnswer.length;
  let weight = base;

  if (/[0-9]/.test(normalizedAnswer)) {
    weight += 0.5;
  }

  if (/[^a-z0-9\s]/.test(normalizedAnswer)) {
    weight += 0.5;
  }

  if (weight === 0) {
    weight = 0.5;
  }

  const clipped = Math.min(3.0, Math.max(0.5, weight / 5));
  return Math.round(clipped * 10) / 10;
}

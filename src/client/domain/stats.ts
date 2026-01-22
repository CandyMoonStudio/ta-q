import { Question, ReviewData, ReviewItem } from '../types.js';

export interface StatsCounts {
  ok: number;
  debug: number;
  ng: number;
  hold: number;
  unset: number;
  [key: string]: number;
}

export function getEffectiveStatus(q: Question, review?: ReviewItem): string {
  // Get initial status from data
  let initialStatus = q._list || 'unset';
  if (initialStatus === 'prod') initialStatus = 'ok';

  let effectiveStatus: string;

  if (review && review.status !== undefined) {
    // Review exists and has status property (null means unset in logic, but let's be explicit)
    effectiveStatus = review.status === null ? 'unset' : review.status;
  } else {
    // No review, use initial status
    effectiveStatus = initialStatus;
  }

  // Normalize prod to ok
  if (effectiveStatus === 'prod') effectiveStatus = 'ok';

  return effectiveStatus;
}

export function calculateStats(questions: Question[], reviewData: ReviewData): StatsCounts {
  const counts: StatsCounts = { ok: 0, debug: 0, ng: 0, hold: 0, unset: 0 };

  questions.forEach((q) => {
    const id = String(q.id);
    const review = reviewData[id];
    const status = getEffectiveStatus(q, review);

    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status]++;
    }
  });

  return counts;
}

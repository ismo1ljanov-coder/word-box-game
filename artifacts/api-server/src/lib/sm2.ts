export interface Sm2State {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  nextReviewAt: Date;
}

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0-5 (0-2 = incorrect/hard, 3-5 = correct)
 * We map our boolean `correct` to quality:
 *   correct=true  → quality 4 (good recall)
 *   correct=false → quality 1 (incorrect)
 */
export function computeSm2(state: Sm2State, correct: boolean): Sm2Result {
  const quality = correct ? 4 : 1;

  let { easeFactor, interval, repetitions } = state;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);
  nextReviewAt.setHours(0, 0, 0, 0);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

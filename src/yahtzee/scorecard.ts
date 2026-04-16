import { allocUnsafe } from 'bun';
import { type Category, categories, upperCategories, lowerCategories } from './category';

export type Scorecard = Partial<Record<Category, number>>;

export const emptyScorecard: Scorecard = Object.freeze({});

export function calculateUpperScore(scorecard: Readonly<Scorecard>): number {
  return upperCategories.reduce((acc, category) => acc + (scorecard[category] ?? 0), 0);
}

export function calculateLowerScore(scorecard: Readonly<Scorecard>): number {
  return lowerCategories.reduce((acc, category) => acc + (scorecard[category] ?? 0), 0);
}

export function bonusScoreFromUpperScore(upperScore: number): number {
  return upperScore >= 63 ? 35 : 0;
}

export function countScoredUpperCategories(scorecard: Readonly<Scorecard>): number {
  return upperCategories.filter(category => category in scorecard).length;
}

export function countScoredLowerCategories(scorecard: Readonly<Scorecard>): number {
  return lowerCategories.filter(category => category in scorecard).length;
}

export function countScoredCategories(scorecard: Readonly<Scorecard>): number {
  return countScoredLowerCategories(scorecard) + countScoredUpperCategories(scorecard);
}

export function hasUnscoredCategories(scorecard: Readonly<Scorecard>): boolean {
  return categories.some(category => typeof scorecard[category] === "undefined");
}

export function calculateBonusScore(scorecard: Readonly<Scorecard>): number {
  const upperScore = calculateUpperScore(scorecard);
  return bonusScoreFromUpperScore(upperScore);
}

export function calculateTotalScore(scorecard: Readonly<Scorecard>): number {
  const lowerScore = calculateLowerScore(scorecard);
  const upperScore = calculateUpperScore(scorecard);
  const bonusScore = bonusScoreFromUpperScore(upperScore);
  return lowerScore + upperScore + bonusScore;
}

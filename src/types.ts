import type { DeepReadonly } from './DeepReadonly';
import { getRandomElement } from './random';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export const allDieValueValues: Readonly<Array<DieValue>> = Object.freeze([1, 2, 3, 4, 5, 6]);

export function isDieValue(value: unknown): value is DieValue {
  return allDieValueValues.some(v => v === value);
}

export function assertIsDieValue(value: unknown): asserts value is DieValue {
  if (! isDieValue(value)) {
    throw new Error(`not a DieValue: ${value}`);
  }
}

export function randomDieValue(): DieValue {
  return getRandomElement(allDieValueValues);
}

export type GameDiceIndex = 0 | 1 | 2 | 3 | 4;

export type GameDice = [DieValue, DieValue, DieValue, DieValue, DieValue];

export function randomGameDice(): GameDice {
  return [randomDieValue(), randomDieValue(), randomDieValue(), randomDieValue(), randomDieValue()];
}

export type GameDiceKeptFlags = [boolean, boolean, boolean, boolean, boolean];

export function cloneGameDiceKeptFlags(source: Readonly<GameDiceKeptFlags>): GameDiceKeptFlags {
  return [...source];
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  dice: GameDice;
  kept: GameDiceKeptFlags;
  rollsLeft: number;
}

export function currentPlayerFromGameState(gameState: DeepReadonly<GameState>): DeepReadonly<Player> {
  const players = gameState.players;
  const currentPlayerIndex = gameState.currentPlayerIndex;

  const player = players[currentPlayerIndex];
  if (!player) {
    throw new Error(`internal error xap87g2wyy: players[currentPlayerIndex] is ${player} ` 
      + `(currentPlayerIndex=${currentPlayerIndex}, players.length=${players.length})`);
  }

  return player;
}

export type UpperCategory = "ones" | "twos" | "threes" | "fours" | "fives" | "sixes";

export const allUpperCategoryValues : Readonly<Array<UpperCategory>> =
  Object.freeze(["ones", "twos", "threes", "fours", "fives", "sixes"]);

export type LowerCategory = "threeOfAKind" | "fourOfAKind" | "fullHouse" | "smallStraight" | "largeStraight" | "yahtzee" | "chance";

export const allLowerCategoryValues : Readonly<Array<LowerCategory>> =
  Object.freeze(["threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance"]);

export type Category = UpperCategory | LowerCategory;

export const allCategoryValues : Readonly<Array<Category>> =
  Object.freeze([...allUpperCategoryValues, ...allLowerCategoryValues]);

export const CATEGORY_NAMES: Readonly<Record<Category, string>> = Object.freeze({
  ones: "ones",
  twos: "twos",
  threes: "threes",
  fours: "fours",
  fives: "fives",
  sixes: "sixes",
  threeOfAKind: "3-of-a-kind",
  fourOfAKind: "4-of-a-kind",
  fullHouse: "full house",
  smallStraight: "sm straight",
  largeStraight: "lg straight",
  yahtzee: "yahtzee",
  chance: "chance",
});

export const CATEGORY_ICONS: Readonly<Record<Category, string>> = Object.freeze({
  ones: "⚀",
  twos: "⚁",
  threes: "⚂",
  fours: "⚃",
  fives: "⚄",
  sixes: "⚅",
  threeOfAKind: "③",
  fourOfAKind: "④",
  fullHouse: "⌂",
  smallStraight: "⇀",
  largeStraight: "⇉",
  yahtzee: "★",
  chance: "❂",
});

export type Scorecard = Record<Category, number | null>;

export function upperScoreFromScorecard(scorecard: DeepReadonly<Scorecard>): number {
  return allUpperCategoryValues.reduce((acc, category) => acc + (scorecard[category] ?? 0), 0);
}

export function lowerScoreFromScorecard(scorecard: DeepReadonly<Scorecard>): number {
  return allLowerCategoryValues.reduce((acc, category) => acc + (scorecard[category] ?? 0), 0);
}

export function bonusScoreFromUpperScore(upperScore: number): number {
  return upperScore >= 63 ? 35 : 0;
}

export function bonusScoreFromScorecard(scorecard: DeepReadonly<Scorecard>): number {
  const upperScore = upperScoreFromScorecard(scorecard);
  return bonusScoreFromUpperScore(upperScore);
}

export function totalScoreFromScorecard(scorecard: Readonly<Scorecard>): number {
  const lowerScore = lowerScoreFromScorecard(scorecard);
  const upperScore = upperScoreFromScorecard(scorecard);
  const bonusScore = bonusScoreFromUpperScore(upperScore);
  return lowerScore + upperScore + bonusScore;
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  scorecard: Scorecard;
}

export type GamePhase = "START" | "ROLLING" | "SCORING" | "GAME_OVER";

export type Action =
  | { type: "START_GAME"; playerNames: { name: string; isAI: boolean }[] }
  | { type: "ROLL_DICE" }
  | { type: "TOGGLE_KEEPER"; index: GameDiceIndex }
  | { type: "CLEAR_KEEPERS" }
  | { type: "SCORE_CATEGORY"; category: Category }
  | { type: "RESTART_GAME" };

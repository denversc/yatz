export type Category =
  | "ones" | "twos" | "threes" | "fours" | "fives" | "sixes"
  | "threeOfAKind" | "fourOfAKind" | "fullHouse" | "smallStraight" | "largeStraight" | "yahtzee" | "chance";

export type Scorecard = Record<Category, number | null>;

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  scorecard: Scorecard;
}

export type GamePhase = "START" | "ROLLING" | "SCORING" | "GAME_OVER";

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  dice: number[];
  kept: boolean[];
  rollsLeft: number;
}

export type Action =
  | { type: "START_GAME"; playerNames: { name: string; isAI: boolean }[] }
  | { type: "ROLL_DICE" }
  | { type: "TOGGLE_KEEPER"; index: number }
  | { type: "CLEAR_KEEPERS" }
  | { type: "SCORE_CATEGORY"; category: Category }
  | { type: "RESTART_GAME" };

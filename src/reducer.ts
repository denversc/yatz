import type { Action, Category, GameState, Player, Scorecard } from "./types";

export const INITIAL_SCORECARD: Scorecard = {
  ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
  threeOfAKind: null, fourOfAKind: null, fullHouse: null,
  smallStraight: null, largeStraight: null, yahtzee: null, chance: null,
};

function getRandomDice() {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
}

export const INITIAL_STATE: GameState = {
  players: [],
  currentPlayerIndex: 0,
  phase: "START",
  dice: [1, 1, 1, 1, 1],
  kept: [false, false, false, false, false],
  rollsLeft: 3,
};

export function calculateScore(dice: number[], category: Category): number {
  const counts = dice.reduce((acc, d) => {
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const sum = dice.reduce((a, b) => a + b, 0);
  const values = Object.values(counts);
  const uniqueDice = Array.from(new Set(dice)).sort();

  switch (category) {
    case "ones": return (counts[1] || 0) * 1;
    case "twos": return (counts[2] || 0) * 2;
    case "threes": return (counts[3] || 0) * 3;
    case "fours": return (counts[4] || 0) * 4;
    case "fives": return (counts[5] || 0) * 5;
    case "sixes": return (counts[6] || 0) * 6;
    case "threeOfAKind": return values.some(v => v >= 3) ? sum : 0;
    case "fourOfAKind": return values.some(v => v >= 4) ? sum : 0;
    case "fullHouse": return (values.includes(3) && values.includes(2)) || values.includes(5) ? 25 : 0;
    case "smallStraight":
      const hasSmall = /(1234|2345|3456)/.test(uniqueDice.join(""));
      return hasSmall ? 30 : 0;
    case "largeStraight":
      const hasLarge = /(12345|23456)/.test(uniqueDice.join(""));
      return hasLarge ? 40 : 0;
    case "yahtzee": return values.includes(5) ? 50 : 0;
    case "chance": return sum;
    default: return 0;
  }
}

export function getUpperScore(scorecard: Scorecard): number {
  const upperCategories: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];
  return upperCategories.reduce((acc, cat) => acc + (scorecard[cat] || 0), 0);
}

export function getBonus(scorecard: Scorecard): number {
  return getUpperScore(scorecard) >= 63 ? 35 : 0;
}

export function getTotalScore(scorecard: Scorecard): number {
  const baseScore = (Object.values(scorecard) as (number | null)[]).reduce((acc, v) => acc + (v || 0), 0);
  return baseScore + getBonus(scorecard);
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...INITIAL_STATE,
        players: action.playerNames.map((p, i) => ({
          id: String(i),
          name: p.name,
          isAI: p.isAI,
          scorecard: { ...INITIAL_SCORECARD },
        })),
        phase: "ROLLING",
        dice: getRandomDice(),
        rollsLeft: 2, // First roll just happened
      };

    case "ROLL_DICE":
      if (state.phase !== "ROLLING" || state.rollsLeft === 0) return state;
      const newDice = state.dice.map((d, i) => (state.kept[i] ? d : Math.floor(Math.random() * 6) + 1));
      const newRollsLeft = state.rollsLeft - 1;
      return {
        ...state,
        dice: newDice,
        rollsLeft: newRollsLeft,
        phase: newRollsLeft === 0 ? "SCORING" : "ROLLING",
      };

    case "TOGGLE_KEEPER":
      if (state.phase !== "ROLLING") return state;
      const newKept = [...state.kept];
      newKept[action.index] = !newKept[action.index];
      return { ...state, kept: newKept };

    case "CLEAR_KEEPERS":
      return { ...state, kept: [false, false, false, false, false] };

    case "SCORE_CATEGORY":
      if (state.phase !== "ROLLING" && state.phase !== "SCORING") return state;
      const player = state.players[state.currentPlayerIndex];
      if (player.scorecard[action.category] !== null) return state;

      const score = calculateScore(state.dice, action.category);
      const newPlayers = [...state.players];
      newPlayers[state.currentPlayerIndex] = {
        ...player,
        scorecard: { ...player.scorecard, [action.category]: score },
      };

      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const isGameOver = nextPlayerIndex === 0 && Object.values(newPlayers[nextPlayerIndex].scorecard).every(v => v !== null);

      return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: isGameOver ? state.currentPlayerIndex : nextPlayerIndex,
        phase: isGameOver ? "GAME_OVER" : "ROLLING",
        dice: getRandomDice(),
        kept: [false, false, false, false, false],
        rollsLeft: 2, // First roll of next turn just happened
      };

    case "RESTART_GAME":
      return INITIAL_STATE;

    default:
      return state;
  }
}

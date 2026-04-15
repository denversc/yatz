import { calculateScore } from "./reducer";
import type { Action, Category, GameState } from "./types";

const strongPriority: Category[] = [
  "yahtzee",
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "largeStraight",
  "smallStraight",
  "fourOfAKind",
  "threeOfAKind",
  "fullHouse",
];

const upperSection: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];

function isStrong(cat: Category, score: number): boolean {
  if (cat === "ones") return score >= 3;
  if (cat === "twos") return score >= 6;
  if (cat === "threes") return score >= 9;
  if (cat === "fours") return score >= 12;
  if (cat === "fives") return score >= 15;
  if (cat === "sixes") return score >= 18;
  if (cat === "chance") return false;
  return score > 0;
}

function getSmallStraightKept(dice: number[]): boolean[] | null {
  const possibleStraights = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  for (const straight of possibleStraights) {
    const kept = [false, false, false, false, false];
    const foundIndices = new Set<number>();
    let matchCount = 0;
    for (const val of straight) {
      const idx = dice.findIndex((d, i) => d === val && !foundIndices.has(i));
      if (idx !== -1) {
        foundIndices.add(idx);
        kept[idx] = true;
        matchCount++;
      }
    }
    if (matchCount === 4) return kept;
  }
  return null;
}

export function getAIAction(state: GameState): Action {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const scorecard = player.scorecard;

  // Helper to find the best "Strong" category
  const getBestStrong = () => {
    let bestCat: Category | null = null;
    let maxVal = -1;

    for (const cat of strongPriority) {
      if (scorecard[cat] === null) {
        const score = calculateScore(dice, cat);
        if (isStrong(cat, score)) {
          if (score > maxVal) {
            maxVal = score;
            bestCat = cat;
          }
          // Ties are broken by the order in strongPriority
        }
      }
    }
    return bestCat;
  };

  const bestStrong = getBestStrong();

  // 1. Special Case: Hunt for Large Straight if we have a Small Straight and rolls left
  if (
    state.phase === "ROLLING" &&
    state.rollsLeft > 0 &&
    scorecard["largeStraight"] === null &&
    calculateScore(dice, "smallStraight") > 0 &&
    bestStrong !== "largeStraight" &&
    bestStrong !== "yahtzee"
  ) {
    const targetKept = getSmallStraightKept(dice);
    if (targetKept) {
      for (let i = 0; i < 5; i++) {
        if (state.kept[i] !== targetKept[i]) {
          return { type: "TOGGLE_KEEPER", index: i };
        }
      }
      return { type: "ROLL_DICE" };
    }
  }

  // 2. Skip re-roll and score immediately if any "Strong" category is found
  if (bestStrong !== null) {
    return { type: "SCORE_CATEGORY", category: bestStrong };
  }

  // 2. Re-roll if possible (ALWAYS re-roll if no strong category found)
  if (state.phase === "ROLLING" && state.rollsLeft > 0) {
    if (state.kept.some(k => k)) {
      return { type: "CLEAR_KEEPERS" };
    }
    return { type: "ROLL_DICE" };
  }

  // 3. Final Scoring Logic (Final roll or no strong points found)

  // 3a. Best strong (already checked, but for completeness in SCORING phase)
  if (bestStrong !== null) {
    return { type: "SCORE_CATEGORY", category: bestStrong };
  }

  // 3b. Upper section that gives the most points (Fallback)
  let bestUpper: Category | null = null;
  let maxUpperVal = -1;
  for (const cat of upperSection) {
    if (scorecard[cat] === null) {
      const score = calculateScore(dice, cat);
      if (score > maxUpperVal) {
        maxUpperVal = score;
        bestUpper = cat;
      }
    }
  }

  if (bestUpper !== null) {
    return { type: "SCORE_CATEGORY", category: bestUpper };
  }

  // 3c. Chance
  if (scorecard["chance"] === null) {
    return { type: "SCORE_CATEGORY", category: "chance" };
  }

  // 3d. Absolute Fallback: Pick first available
  const available = (Object.keys(scorecard) as Category[]).filter(c => scorecard[c] === null);
  return { type: "SCORE_CATEGORY", category: available[0] };
}

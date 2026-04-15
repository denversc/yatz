import { calculateScore } from "./reducer";
import type { Action, Category, GameState } from "./types";

const lowerSectionPriority: Category[] = [
  "yahtzee",
  "largeStraight",
  "smallStraight",
  "fourOfAKind",
  "threeOfAKind",
  "fullHouse",
];

const upperSection: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];

export function getAIAction(state: GameState): Action {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const scorecard = player.scorecard;

  // Helper to find the best lower section category (excluding chance) with > 0 points
  const getBestLower = () => {
    let bestCat: Category | null = null;
    let maxVal = -1;

    for (const cat of lowerSectionPriority) {
      if (scorecard[cat] === null) {
        const score = calculateScore(dice, cat);
        if (score > 0) {
          if (score > maxVal) {
            maxVal = score;
            bestCat = cat;
          }
          // If score === maxVal, we keep the one already found as it has higher priority
        }
      }
    }
    return bestCat;
  };

  const bestLower = getBestLower();

  // 1. Exception: Skip re-roll and score immediately if any lower (excl. chance) is non-zero
  if (bestLower !== null) {
    return { type: "SCORE_CATEGORY", category: bestLower };
  }

  // 2. Re-roll if possible (ALWAYS re-roll)
  if (state.phase === "ROLLING" && state.rollsLeft > 0) {
    // To ensure we roll all dice as implied by "ALWAYS re-roll", clear any keepers first.
    if (state.kept.some(k => k)) {
      return { type: "CLEAR_KEEPERS" };
    }
    return { type: "ROLL_DICE" };
  }

  // 3. Final Scoring Logic (Final roll or no lower section points found)

  // 3a. Best lower (already checked, if null move to upper)
  if (bestLower !== null) {
    return { type: "SCORE_CATEGORY", category: bestLower };
  }

  // 3b. Upper section that gives the most points
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

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

  // 1. ROLLING Phase Strategy (with rolls left)
  if (state.phase === "ROLLING" && state.rollsLeft > 0) {
    // 1a. Always score immediate winners
    if (bestStrong === "yahtzee" || bestStrong === "largeStraight" || bestStrong === "fullHouse") {
      return { type: "SCORE_CATEGORY", category: bestStrong };
    }

    // 1b. Hunt for Large Straight if we have a Small Straight
    if (scorecard["largeStraight"] === null && calculateScore(dice, "smallStraight") > 0) {
      const targetKept = getSmallStraightKept(dice);
      if (targetKept) {
        for (let i = 0; i < 5; i++) {
          if (state.kept[i] !== targetKept[i]) return { type: "TOGGLE_KEEPER", index: i };
        }
        return { type: "ROLL_DICE" };
      }
    }

    // 1c. Hunt or Chase Upper Section
    // First, see if we have a strong upper category we'd want to improve
    let targetUpper: Category | null = null;
    if (bestStrong && upperSection.includes(bestStrong)) {
      targetUpper = bestStrong;
    } else {
      // Otherwise, find the best available upper category to "chase" (>= 2 dice)
      let maxCount = 1;
      for (const cat of upperSection) {
        if (scorecard[cat] === null) {
          const val = upperSection.indexOf(cat) + 1;
          const count = dice.filter(d => d === val).length;
          if (count > maxCount) {
            maxCount = count;
            targetUpper = cat;
          } else if (count === maxCount && count >= 2 && targetUpper) {
            // Tie-break: higher value
            if (val > upperSection.indexOf(targetUpper) + 1) targetUpper = cat;
          }
        }
      }
    }

    if (targetUpper) {
      const val = upperSection.indexOf(targetUpper) + 1;
      const targetKept = dice.map(d => d === val);
      for (let i = 0; i < 5; i++) {
        if (state.kept[i] !== targetKept[i]) return { type: "TOGGLE_KEEPER", index: i };
      }
      return { type: "ROLL_DICE" };
    }

    // 1d. If we have any other strong category (like 3-of-a-kind), score it
    if (bestStrong !== null) {
      return { type: "SCORE_CATEGORY", category: bestStrong };
    }

    // 1e. Default: Clear and roll all
    if (state.kept.some(k => k)) return { type: "CLEAR_KEEPERS" };
    return { type: "ROLL_DICE" };
  }

  // 2. SCORING Phase Strategy (Final roll or decided to score)

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

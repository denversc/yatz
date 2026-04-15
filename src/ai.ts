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

function getMostCommonValue(dice: number[], tieBreaker: "random" | "highest", seed?: string): number {
  const counts: Record<number, number> = {};
  for (const d of dice) counts[d] = (counts[d] || 0) + 1;

  let maxCount = 0;
  let candidates: number[] = [];
  for (const [valStr, count] of Object.entries(counts)) {
    const val = Number(valStr);
    if (count > maxCount) {
      maxCount = count;
      candidates = [val];
    } else if (count === maxCount) {
      candidates.push(val);
    }
  }

  if (candidates.length === 1) return candidates[0];

  if (tieBreaker === "highest") {
    return Math.max(...candidates);
  } else {
    if (seed) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      return candidates[Math.abs(hash) % candidates.length];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}

function getStraightKept(dice: number[], length: 4 | 5, prioritizeOpenEnded: boolean): boolean[] {
  const straights4 = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
  const straights5 = [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]];
  const possibleStraights = length === 4 ? straights4 : straights5;

  let bestKept: boolean[] = [false, false, false, false, false];
  let maxMatches = -1;
  let bestIsPriority = false;

  for (const straight of possibleStraights) {
    const kept = [false, false, false, false, false];
    const foundIndices = new Set<number>();
    let matches = 0;
    for (const val of straight) {
      const idx = dice.findIndex((d, i) => d === val && !foundIndices.has(i));
      if (idx !== -1) {
        foundIndices.add(idx);
        kept[idx] = true;
        matches++;
      }
    }

    const isPriority = prioritizeOpenEnded && (
      (length === 4 && (straight[0] === 2 || straight[0] === 3)) ||
      (length === 5 && straight[0] === 2)
    );

    if (matches > maxMatches || (matches === maxMatches && isPriority && !bestIsPriority)) {
      maxMatches = matches;
      bestKept = kept;
      bestIsPriority = isPriority;
    }
  }
  return bestKept;
}

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

export function getAIAction(state: GameState): Action {
  const player = state.players[state.currentPlayerIndex];
  const dice = state.dice;
  const scorecard = player.scorecard;
  const remainingCategories = (Object.keys(scorecard) as Category[]).filter(c => scorecard[c] === null);

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
    // 1a. Aggressive hunting for the LAST category
    if (remainingCategories.length === 1) {
      const lastCat = remainingCategories[0];
      const score = calculateScore(dice, lastCat);

      // If it's a "perfect" score for fixed categories, just score it
      if (lastCat === "yahtzee" && score === 50) return { type: "SCORE_CATEGORY", category: lastCat };
      if (lastCat === "largeStraight" && score === 40) return { type: "SCORE_CATEGORY", category: lastCat };
      if (lastCat === "smallStraight" && score === 30) return { type: "SCORE_CATEGORY", category: lastCat };
      if (lastCat === "fullHouse" && score === 25) return { type: "SCORE_CATEGORY", category: lastCat };

      let targetKept: boolean[] | null = null;

      if (upperSection.includes(lastCat)) {
        const val = upperSection.indexOf(lastCat) + 1;
        if (dice.every(d => d === val)) return { type: "SCORE_CATEGORY", category: lastCat };
        targetKept = dice.map(d => d === val);
      } else if (lastCat === "yahtzee") {
        const seed = dice.slice().sort().join(",");
        const mostCommonVal = getMostCommonValue(dice, "random", seed);
        targetKept = dice.map(d => d === mostCommonVal);
      } else if (lastCat === "threeOfAKind" || lastCat === "fourOfAKind") {
        const mostCommonVal = getMostCommonValue(dice, "highest");
        targetKept = dice.map(d => d === mostCommonVal);
      } else if (lastCat === "smallStraight") {
        targetKept = getStraightKept(dice, 4, true);
      } else if (lastCat === "largeStraight") {
        targetKept = getStraightKept(dice, 5, true);
      } else if (lastCat === "fullHouse") {
        const counts: Record<number, number> = {};
        for (const d of dice) counts[d] = (counts[d] || 0) + 1;
        const sorted = Object.entries(counts)
          .map(([val, count]) => ({ val: Number(val), count }))
          .sort((a, b) => b.count - a.count || b.val - a.val);
        const topValues = sorted.slice(0, 2).map(s => s.val);
        targetKept = dice.map(d => topValues.includes(d));
      } else if (lastCat === "chance") {
        targetKept = dice.map(d => d >= 4);
      }

      if (targetKept) {
        for (let i = 0; i < 5; i++) {
          if (state.kept[i] !== targetKept[i]) return { type: "TOGGLE_KEEPER", index: i };
        }
        return { type: "ROLL_DICE" };
      }
    }

    // 1b. Standard logic: score immediate winners
    if (bestStrong === "yahtzee" || bestStrong === "largeStraight" || bestStrong === "fullHouse") {
      return { type: "SCORE_CATEGORY", category: bestStrong };
    }

    // 1c. Hunt for Large Straight if we have a Small Straight
    if (scorecard["largeStraight"] === null && calculateScore(dice, "smallStraight") > 0) {
      const targetKept = getStraightKept(dice, 4, false); // Just keep what we have
      if (targetKept) {
        for (let i = 0; i < 5; i++) {
          if (state.kept[i] !== targetKept[i]) return { type: "TOGGLE_KEEPER", index: i };
        }
        return { type: "ROLL_DICE" };
      }
    }

    // 1d. Hunt or Chase Upper Section
    let targetUpper: Category | null = null;
    if (bestStrong && upperSection.includes(bestStrong)) {
      targetUpper = bestStrong;
    } else {
      let maxCount = 1;
      for (const cat of upperSection) {
        if (scorecard[cat] === null) {
          const val = upperSection.indexOf(cat) + 1;
          const count = dice.filter(d => d === val).length;
          if (count > maxCount) {
            maxCount = count;
            targetUpper = cat;
          } else if (count === maxCount && count >= 2 && targetUpper) {
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

    // 1e. If we have any other strong category (like 3-of-a-kind), score it
    if (bestStrong !== null) {
      return { type: "SCORE_CATEGORY", category: bestStrong };
    }

    // 1f. Default: Clear and roll all
    if (state.kept.some(k => k)) return { type: "CLEAR_KEEPERS" };
    return { type: "ROLL_DICE" };
  }

  // 2. SCORING Phase Strategy (Final roll or decided to score)
  if (bestStrong !== null) {
    return { type: "SCORE_CATEGORY", category: bestStrong };
  }

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

  if (scorecard["chance"] === null) {
    return { type: "SCORE_CATEGORY", category: "chance" };
  }

  const available = (Object.keys(scorecard) as Category[]).filter(c => scorecard[c] === null);
  return { type: "SCORE_CATEGORY", category: available[0] };
}

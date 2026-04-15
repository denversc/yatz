import { expect, test, describe } from "bun:test";
import { getAIAction } from "./ai";
import { INITIAL_STATE, INITIAL_SCORECARD } from "./reducer";
import type { GameState } from "./types";

describe("getAIAction", () => {
  test("picks the best scoring category when in scoring phase", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "SCORING",
      dice: [6, 6, 6, 1, 1], // Full House (25), Sixes (18), Three of a Kind (20), Chance (20)
      rollsLeft: 0,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("fullHouse");
    }
  });

  test("priority tie-breaking in lower section", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "SCORING",
      dice: [1, 1, 1, 1, 1], // Scores 50 in Yahtzee, but also valid for many others
      rollsLeft: 0,
    };
    // 50 points in Yahtzee is the max.
    // What if we have multiple categories with same score?
    // Let's force a tie between largeStraight (40) and smallStraight (30)? No.
    // Three of a kind (sum) vs Four of a kind (sum)?
    // dice [2, 2, 2, 2, 6] -> Sum is 14. 
    // Three of a kind: 14.
    // Four of a kind: 14.
    // Four of a kind has higher priority than Three of a kind (4 vs 5 in list).
    
    state.dice = [2, 2, 2, 2, 6];
    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("fourOfAKind");
    }
  });

  test("skips re-roll if lower section score is found", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "ROLLING",
      dice: [1, 2, 3, 4, 1], // Small Straight (30)
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("smallStraight");
    }
  });

  test("always re-rolls if no lower section score is found", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "ROLLING",
      dice: [1, 2, 6, 4, 1], // No lower section score > 0
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("ROLL_DICE");
  });

  test("clears keepers if re-rolling with keepers set", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "ROLLING",
      dice: [1, 2, 6, 4, 1],
      kept: [true, false, false, false, false],
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("CLEAR_KEEPERS");
  });

  test("falls back to upper section on final roll", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { ...INITIAL_SCORECARD },
        },
      ],
      currentPlayerIndex: 0,
      phase: "SCORING",
      dice: [1, 2, 6, 4, 1], // No lower section points
      rollsLeft: 0,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("sixes"); // 6s give 6 points
    }
  });

  test("falls back to chance if upper section is zero/unavailable", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { 
            ...INITIAL_SCORECARD,
            ones: 2, twos: 4, threes: 6, fours: 8, fives: 10, sixes: 12
          },
        },
      ],
      currentPlayerIndex: 0,
      phase: "SCORING",
      dice: [1, 2, 6, 4, 1],
      rollsLeft: 0,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("chance");
    }
  });
});

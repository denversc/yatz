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

  test("picks the best category even if it's 0 (greedy but simple)", () => {
    const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
                ...INITIAL_SCORECARD,
                fullHouse: 25,
                chance: 20,
                sixes: 18,
                threeOfAKind: 20,
                fives: 0,
                fours: 0,
                threes: 0,
                twos: 0,
                ones: 0,
                fourOfAKind: 0,
                smallStraight: 0,
                largeStraight: 0,
            },
          },
        ],
        currentPlayerIndex: 0,
        phase: "SCORING",
        dice: [1, 1, 1, 1, 1], 
        rollsLeft: 0,
      };
      // Only yahtzee is left. 
      // dice [1,1,1,1,1] scores 50 in yahtzee.
      
      const action = getAIAction(state);
      expect(action.type).toBe("SCORE_CATEGORY");
      if (action.type === "SCORE_CATEGORY") {
        expect(action.category).toBe("yahtzee");
      }
  });
});

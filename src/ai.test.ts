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
      dice: [2, 2, 3, 3, 3], // Full House (25)
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("fullHouse");
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
      dice: [1, 2, 3, 5, 6], // No pairs, no small straight
      rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("ROLL_DICE");
      });

      test("clears keepers if re-rolling with keepers set and no chase candidate", () => {
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
      dice: [1, 2, 3, 5, 6],
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

  test("hunts for more 'ones' even if 'ones' is already strong", () => {
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { 
            ...INITIAL_SCORECARD,
          },
        },
      ],
      currentPlayerIndex: 0,
      phase: "ROLLING",
      dice: [1, 2, 1, 3, 1], // ones = 3 (Strong)
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("TOGGLE_KEEPER");
  });

  test("prefers fullHouse over strong sixes due to higher score", () => {
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
      dice: [6, 6, 1, 1, 6], // sixes=18 (Strong), fullHouse=25 (Strong)
      rollsLeft: 2,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("fullHouse");
    }
  });

  test("tie-breaking: strong upper section ranks below yahtzee but above others", () => {
    // dice [6, 6, 6, 6, 6] -> yahtzee=50, sixes=30, fourOfAKind=30, threeOfAKind=30
    const state: GameState = {
      ...INITIAL_STATE,
      players: [
        {
          id: "0",
          name: "AI",
          isAI: true,
          scorecard: { 
            ...INITIAL_SCORECARD,
            yahtzee: 50 // yahtzee already scored
          },
        },
      ],
      currentPlayerIndex: 0,
      phase: "SCORING",
      dice: [6, 6, 6, 6, 6], 
      rollsLeft: 0,
    };

    const action = getAIAction(state);
    expect(action.type).toBe("SCORE_CATEGORY");
    if (action.type === "SCORE_CATEGORY") {
      expect(action.category).toBe("sixes"); // Tie-break: sixes=30 vs fourOfAKind=30. sixes wins.
    }
  });

  describe("Aggressive AI last category", () => {
    test("re-rolls 'twos' even if strong (3 dice) when it's the last category", () => {
      const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
              ...INITIAL_SCORECARD,
              ones: 3, threes: 9, fours: 12, fives: 15, sixes: 18,
              threeOfAKind: 20, fourOfAKind: 20, fullHouse: 25,
              smallStraight: 30, largeStraight: 40, yahtzee: 50, chance: 20
            }, // Only 'twos' is null
          },
        ],
        currentPlayerIndex: 0,
        phase: "ROLLING",
        dice: [2, 2, 2, 1, 1],
        rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("TOGGLE_KEEPER");
    });

    test("hunts for 'yahtzee' by keeping most common dice when it's the last category", () => {
      const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
              ...INITIAL_SCORECARD,
              ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
              threeOfAKind: 20, fourOfAKind: 20, fullHouse: 25,
              smallStraight: 30, largeStraight: 40, chance: 20
            }, // Only 'yahtzee' is null
          },
        ],
        currentPlayerIndex: 0,
        phase: "ROLLING",
        dice: [6, 6, 6, 1, 2],
        rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("TOGGLE_KEEPER");
      if (action.type === "TOGGLE_KEEPER") {
          expect([0, 1, 2]).toContain(action.index);
      }
    });

    test("hunts for '3-of-a-kind' by keeping most common and breaking ties with highest value", () => {
      const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
              ...INITIAL_SCORECARD,
              ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
              fourOfAKind: 20, fullHouse: 25, smallStraight: 30, largeStraight: 40,
              yahtzee: 50, chance: 20
            }, // Only 'threeOfAKind' is null
          },
        ],
        currentPlayerIndex: 0,
        phase: "ROLLING",
        dice: [2, 2, 5, 5, 1],
        rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("TOGGLE_KEEPER");
      if (action.type === "TOGGLE_KEEPER") {
          expect([2, 3]).toContain(action.index);
      }
    });

    test("hunts for 'smallStraight' prioritizing open-ended (2,3 start)", () => {
      const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
              ...INITIAL_SCORECARD,
              ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
              threeOfAKind: 20, fourOfAKind: 20, fullHouse: 25,
              largeStraight: 40, yahtzee: 50, chance: 20
            }, // Only 'smallStraight' is null
          },
        ],
        currentPlayerIndex: 0,
        phase: "ROLLING",
        dice: [1, 2, 3, 5, 6],
        rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("TOGGLE_KEEPER");
      if (action.type === "TOGGLE_KEEPER") {
          expect(action.index).not.toBe(0); 
      }
    });

    test("hunts for 'largeStraight' prioritizing open-ended (2 start)", () => {
      const state: GameState = {
        ...INITIAL_STATE,
        players: [
          {
            id: "0",
            name: "AI",
            isAI: true,
            scorecard: { 
              ...INITIAL_SCORECARD,
              ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18,
              threeOfAKind: 20, fourOfAKind: 20, fullHouse: 25,
              smallStraight: 30, yahtzee: 50, chance: 20
            }, // Only 'largeStraight' is null
          },
        ],
        currentPlayerIndex: 0,
        phase: "ROLLING",
        dice: [1, 2, 3, 4, 6],
        rollsLeft: 2,
      };

      const action = getAIAction(state);
      expect(action.type).toBe("TOGGLE_KEEPER");
      if (action.type === "TOGGLE_KEEPER") {
          expect(action.index).not.toBe(0);
      }
    });
  });
});

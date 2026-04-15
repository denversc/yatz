import { expect, test, describe } from "bun:test";
import { calculateScore, reducer, INITIAL_STATE } from "./reducer";

describe("calculateScore", () => {
  test("ones", () => {
    expect(calculateScore([1, 1, 2, 3, 4], "ones")).toBe(2);
    expect(calculateScore([2, 2, 2, 3, 4], "ones")).toBe(0);
  });

  test("fullHouse", () => {
    expect(calculateScore([2, 2, 3, 3, 3], "fullHouse")).toBe(25);
    expect(calculateScore([2, 2, 2, 2, 2], "fullHouse")).toBe(25);
    expect(calculateScore([2, 2, 3, 3, 4], "fullHouse")).toBe(0);
  });

  test("smallStraight", () => {
    expect(calculateScore([1, 2, 3, 4, 6], "smallStraight")).toBe(30);
    expect(calculateScore([1, 2, 3, 4, 5], "smallStraight")).toBe(30);
    expect(calculateScore([1, 3, 4, 5, 6], "smallStraight")).toBe(30);
    expect(calculateScore([1, 2, 3, 5, 6], "smallStraight")).toBe(0);
  });

  test("largeStraight", () => {
    expect(calculateScore([1, 2, 3, 4, 5], "largeStraight")).toBe(40);
    expect(calculateScore([2, 3, 4, 5, 6], "largeStraight")).toBe(40);
    expect(calculateScore([1, 2, 3, 4, 6], "largeStraight")).toBe(0);
  });
});

describe("bonus calculation", () => {
  const INITIAL_SCORECARD = {
    ones: null, twos: null, threes: null, fours: null, fives: null, sixes: null,
    threeOfAKind: null, fourOfAKind: null, fullHouse: null,
    smallStraight: null, largeStraight: null, yahtzee: null, chance: null,
  };
  const { getUpperScore, getBonus, getTotalScore } = require("./reducer");

  test("getUpperScore", () => {
    const scorecard = { ...INITIAL_SCORECARD, ones: 3, twos: 6, threes: 9 };
    expect(getUpperScore(scorecard)).toBe(18);
  });

  test("getBonus - not eligible", () => {
    const scorecard = { ...INITIAL_SCORECARD, ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 17 }; // sum = 62
    expect(getBonus(scorecard)).toBe(0);
    expect(getTotalScore(scorecard)).toBe(62);
  });

  test("getBonus - eligible exactly 63", () => {
    const scorecard = { ...INITIAL_SCORECARD, ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }; // sum = 63
    expect(getBonus(scorecard)).toBe(35);
    expect(getTotalScore(scorecard)).toBe(63 + 35);
  });

  test("getBonus - eligible over 63", () => {
    const scorecard = { ...INITIAL_SCORECARD, ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30 }; // sum = 105
    expect(getBonus(scorecard)).toBe(35);
    expect(getTotalScore(scorecard)).toBe(105 + 35);
  });
});

describe("reducer", () => {
  test("START_GAME", () => {
    const state = reducer(INITIAL_STATE, {
      type: "START_GAME",
      playerNames: [{ name: "Alice", isAI: false }],
    });
    expect(state.players.length).toBe(1);
    expect(state.players[0].name).toBe("Alice");
    expect(state.phase).toBe("ROLLING");
    expect(state.rollsLeft).toBe(2); // Starts with first roll done
  });

  test("ROLL_DICE", () => {
    let state = reducer(INITIAL_STATE, {
      type: "START_GAME",
      playerNames: [{ name: "Alice", isAI: false }],
    });
    // Already has 1 roll done (rollsLeft: 2)
    state = reducer(state, { type: "ROLL_DICE" });
    expect(state.rollsLeft).toBe(1);
    expect(state.dice.every(d => d >= 1 && d <= 6)).toBe(true);
  });
});

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

import type { Action, Category, GameState } from "./types";

export function getAIAction(state: GameState): Action {
  const player = state.players[state.currentPlayerIndex];
  
  if (state.phase === "ROLLING") {
    // Decision logic for rolling
    if (state.rollsLeft > 0 && Math.random() > 0.2) {
      // Randomly toggle some keepers.
      // In a real turn, we'd send multiple TOGGLE_KEEPER actions, 
      // but for this simple functional approach, let's just send one ROLL_DICE 
      // and we'll assume the AI logic in the loop might have toggled some.
      // Wait, the reducer handles actions one by one.
      
      // Simpler: Just roll. If we want to keep some, we'd need a more complex AI.
      // Let's just keep 0-5 dice randomly.
      const indexToToggle = Math.floor(Math.random() * 5);
      if (Math.random() > 0.5) {
        return { type: "TOGGLE_KEEPER", index: indexToToggle };
      }
      return { type: "ROLL_DICE" };
    }
  }

  // If we reach here, we must score.
  const availableCategories = (Object.keys(player.scorecard) as Category[]).filter(
    (cat) => player.scorecard[cat] === null
  );

  const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
  return { type: "SCORE_CATEGORY", category: randomCategory };
}

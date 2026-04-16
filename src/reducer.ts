import { type Category } from './yahtzee/category';
import { emptyScorecard } from './yahtzee/scorecard';
import { type Dice, randomDice, type DiceIndex } from './yahtzee/dice';
import { GameState, allFalseGameStateKeptFlags, type GameStateKeptFlags } from './yahtzee/game_state';
import { type PlayerAction } from './yahtzee/player_action';
import { unreachable } from './util/unreachable';
import { type Random } from './util/random';

export function calculateScore(dice: Readonly<Dice>, category: Category): number {
  const counts = dice.reduce((acc, d) => {
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const sum = dice.reduce((a, b) => a + b, 0);
  const values = Object.values(counts);
  const uniqueDice = Array.from(new Set(dice)).sort();

  switch (category) {
    case "ones": return (counts[1] || 0) * 1;
    case "twos": return (counts[2] || 0) * 2;
    case "threes": return (counts[3] || 0) * 3;
    case "fours": return (counts[4] || 0) * 4;
    case "fives": return (counts[5] || 0) * 5;
    case "sixes": return (counts[6] || 0) * 6;
    case "threeOfAKind": return values.some(v => v >= 3) ? sum : 0;
    case "fourOfAKind": return values.some(v => v >= 4) ? sum : 0;
    case "fullHouse": return (values.includes(3) && values.includes(2)) || values.includes(5) ? 25 : 0;
    case "smallStraight":
      const hasSmall = /(1234|2345|3456)/.test(uniqueDice.join(""));
      return hasSmall ? 30 : 0;
    case "largeStraight":
      const hasLarge = /(12345|23456)/.test(uniqueDice.join(""));
      return hasLarge ? 40 : 0;
    case "yahtzee": return values.includes(5) ? 50 : 0;
    case "chance": return sum;
    default: return 0;
  }
}

export function reducer(state: GameState, action: PlayerAction, random: Random): GameState {
  switch (action.type) {
    case "RollDice":
      const newDice = rollDice(state.dice, state.kept);
      const newRollsLeft = state.rollsLeft - 1;
      return state.withParameters({
        dice: newDice,
        rollsLeft: newRollsLeft,
        phase: newRollsLeft === 0 ? "SCORING" : "ROLLING",
      });

    case "ToggleKeep":
      const newKept = toggleKept(state.kept, action.index);
      return state.withParameters({
        kept: newKept,
      });

    case "ClearKeeps":
      return state.withParameters({
        kept: allFalseGameStateKeptFlags,
      });

    case "ScoreDice":
      const score = calculateScore(state.dice, action.category);
      const oldScorecard = state.scorecardForPlayer(state.currentPlayer)
      const newScorecard = {...oldScorecard, [action.category]: score};
      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

      return state.withParameters({
        currentPlayerScorecard: newScorecard,
        currentPlayerIndex: nextPlayerIndex,
        phase: "ROLLING",
        dice: randomDice(random),
        kept: allFalseGameStateKeptFlags,
        rollsLeft: 2, // First roll of next turn just happened
      });

    default:
      unreachable(action);
  }
}

function rollDice(oldDice: Readonly<Dice>, kept: Readonly<GameStateKeptFlags>, random: Random): Dice {
  const newDice = randomDice(random);

  kept.forEach((kept, index) => {
    if (kept) {
      newDice[index] = oldDice[index]!;
    }
  });

  return newDice;
}

function toggleKept(oldKept: Readonly<GameStateKeptFlags>, toggleIndex: DiceIndex): GameStateKeptFlags {
  const newKept = [...oldKept] as GameStateKeptFlags;
  newKept[toggleIndex] = !newKept[toggleIndex];
  return newKept;
}

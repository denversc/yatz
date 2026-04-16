import { type Random } from '../util/random';

export type PipCount = 1 | 2 | 3 | 4 | 5 | 6;

export const pipCounts: Readonly<Array<PipCount>> = Object.freeze([1, 2, 3, 4, 5, 6]);

export function isPipCount(value: unknown): value is PipCount {
  return pipCounts.some(pipCount => pipCount === value);
}

export function assertIsPipCount(value: unknown): asserts value is PipCount {
  if (! isPipCount(value)) {
    throw new Error(`not a PipCount: ${value}`);
  }
}

export function randomPipCount(random: Random): PipCount {
  return random.elementFromArray(pipCounts);
}

export type DiceIndex = 0 | 1 | 2 | 3 | 4;

export type Dice = [PipCount, PipCount, PipCount, PipCount, PipCount];

export function cloneDice(dice: Readonly<Dice>): Dice {
  return [...dice];
}

export function randomDice(random: Random): Dice {
  return Array.from({ length: 5 }, () => randomPipCount(random)) as Dice;
}

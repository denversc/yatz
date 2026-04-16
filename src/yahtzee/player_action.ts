import type { Category } from "./category";
import type { Player } from "./player";

export type PlayerActionType =
  | "RollDice"
  | "ToggleKeep"
  | "ClearKeeps"
  | "ScoreDice"
  ;

export interface BasePlayerAction {
  readonly type: PlayerActionType;
}

export class RollDiceAction implements BasePlayerAction {
  type = "RollDice" as const;
}

export class ToggleKeepAction implements BasePlayerAction {
  type = "ToggleKeep" as const;

  constructor(readonly index: number) {
  }
}

export class ClearKeepsAction implements BasePlayerAction {
  type = "ClearKeeps" as const;
}

export class ScoreDiceAction implements BasePlayerAction {
  type = "ScoreDice" as const;

  constructor(readonly category: Category) {
  }
}

export type PlayerAction =
  | RollDiceAction
  | ToggleKeepAction
  | ClearKeepsAction
  | ScoreDiceAction
  ;

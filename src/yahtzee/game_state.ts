import { type Dice, cloneDice } from './dice';
import type { Player } from './player';
import { type Scorecard, calculateTotalScore, countScoredLowerCategories, countScoredUpperCategories, calculateLowerScore, calculateUpperScore } from './scorecard';

export interface GameStateConstructorParameters {
  players: Iterable<Player>,
  scorecards: Iterable<Readonly<Scorecard>>,
  currentPlayerIndex: number,
  phase: GamePhase,
  dice: Readonly<Dice>,
  kept: Readonly<GameStateKeptFlags>,
  rollsLeft: number,
}

export interface GameStateUpdateParameters extends Omit<GameStateConstructorParameters, "players" | "scorecards"> {
  currentPlayerScorecard: Readonly<Scorecard>,
}

export class GameState {

  readonly players: Readonly<Array<Player>>;
  readonly #scorecards: Readonly<Array<Readonly<Scorecard>>>;
  readonly currentPlayerIndex: number;
  readonly phase: GamePhase;
  readonly dice: Readonly<Dice>;
  readonly kept: Readonly<GameStateKeptFlags>;
  readonly rollsLeft: number;

  readonly #infoForPlayer = new Map<Player, PlayerInfo>();

  constructor(params: GameStateConstructorParameters) {
    this.players = Object.freeze(Array.from(params.players));
    this.currentPlayerIndex = params.currentPlayerIndex;
    this.phase = params.phase;
    this.dice = Object.freeze(cloneDice(params.dice));
    this.kept = Object.freeze(cloneGameStateKeptFlags(params.kept));
    this.rollsLeft = params.rollsLeft;

    if (this.players.length === 0) {
      throw new Error("players.length === 0");
    }
    this.#scorecards = Array.from(params.scorecards);
    if (this.#scorecards.length !== this.players.length) {
      throw new Error("scorecards.length != players.length " +
        `(scorecards.length=${this.#scorecards.length}, players.length=${this.players.length})`);
    }
    if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
      throw new Error(`invalid currentPlayerIndex: ${this.currentPlayerIndex} ` +
        `(players.length=${this.players.length})`);
    }

    this.players.forEach((player, index) => {
      const scorecard = this.#scorecards[index]!;
      this.#infoForPlayer.set(player, new PlayerInfo(scorecard));
    });
  }

  withParameters(params: Partial<GameStateUpdateParameters>): GameState {
    const scorecards = Array.from(this.#scorecards)
    if ("currentPlayerScorecard" in params) {
      scorecards[this.currentPlayerIndex] = params.currentPlayerScorecard;
    }

    return new GameState({
      players: this.players,
      scorecards,
      currentPlayerIndex: params.currentPlayerIndex ?? this.currentPlayerIndex,
      phase: params.phase ?? this.phase,
      dice: params.dice ?? this.dice,
      kept: params.kept ?? this.kept,
      rollsLeft: params.rollsLeft ?? this.rollsLeft,
    });
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex]!;
  }

  isCurrentPlayer(player: Player): boolean {
    return player === this.currentPlayer;
  }

  #getInfoForPlayer(player: Player): PlayerInfo {
    const playerInfo = this.#infoForPlayer.get(player);
    if (typeof playerInfo === "undefined") {
      throw new Error("player is not a player known by this GameState");
    }
    return playerInfo;
  }

  #getOrSetMemoizedValueForPlayer(player: Player, name: MemoizedValueName, initializer: (scorecard: Readonly<Scorecard>) => number): number {
    const playerInfo = this.#getInfoForPlayer(player);
    const memoizedValue = playerInfo[name];
    return memoizedValue.getOrSet(() => initializer(playerInfo.scorecard));
  }

  playersWithHighestTotalScore(): Player[] {
    let winningScore: number | undefined = undefined;
    let winningPlayers: Player[] = [];

    this.players.forEach(player => {
      const score = this.calculateTotalScoreForPlayer(player);
      if (typeof winningScore === "undefined" || score > winningScore) {
        winningScore = score;
        winningPlayers = [player];
      } else if (score === winningScore) {
        winningPlayers.push(player);
      }
    });

    return winningPlayers;
  }

  playersSortedByTotalScoreDescending(): Player[] {
    return this.players.toSorted((player1, player2) => {
      const score1 = this.calculateTotalScoreForPlayer(player1);
      const score2 = this.calculateTotalScoreForPlayer(player2);
      return score2 - score1;
    });
  }

  scorecardForPlayer(player: Player): Readonly<Scorecard> {
    return this.#getInfoForPlayer(player).scorecard;
  }

  countScoredUpperCategoriesForPlayer(player: Player): number {
    return this.#getOrSetMemoizedValueForPlayer(
      player,
      "scoredUpperCategoriesCount",
      scorecard => countScoredUpperCategories(scorecard),
    );
  }

  countScoredLowerCategoriesForPlayer(player: Player): number {
    return this.#getOrSetMemoizedValueForPlayer(
      player,
      "scoredLowerCategoriesCount",
      scorecard => countScoredLowerCategories(scorecard),
    );
  }

  hasScoredUpperCategoriesForPlayer(player: Player): boolean {
    return this.countScoredUpperCategoriesForPlayer(player) > 0;
  }

  hasScoredLowerCategoriesForPlayer(player: Player): boolean {
    return this.countScoredLowerCategoriesForPlayer(player) > 0;
  }

  calculateTotalScoreForPlayer(player: Player): number {
    return this.#getOrSetMemoizedValueForPlayer(
      player,
      "totalScore",
      scorecard => calculateTotalScore(scorecard),
    );
  }

  calculateUpperScoreForPlayer(player: Player): number {
    return this.#getOrSetMemoizedValueForPlayer(
      player,
      "upperScore",
      scorecard => calculateUpperScore(scorecard),
    );
  }

  calculateLowerScoreForPlayer(player: Player): number {
    return this.#getOrSetMemoizedValueForPlayer(
      player,
      "lowerScore",
      scorecard => calculateLowerScore(scorecard),
    );
  }
}

export type GamePhase = "Rolling" | "Scoring" | "GameOver";

export type GameStateKeptFlags = [boolean, boolean, boolean, boolean, boolean];

export const allFalseGameStateKeptFlags: GameStateKeptFlags = [false, false, false, false, false];

export const MAX_ROLLS_LEFT = 2;

export function cloneGameStateKeptFlags(source: Readonly<GameStateKeptFlags>): GameStateKeptFlags {
  return [...source];
}

class MemoizedValue<T> {
  #value?: T;

  get isSet(): boolean {
    return ("#value" in this);
  }

  get value(): T {
    if ("#value" in this) {
      return this.#value;
    }
    throw new Error("value has not been set in MemoizedValue");
  }

  set(value: T) {
    if ("#value" in this) {
      throw new Error("value of MemoizedValue has already been set");
    }
    this.#value = value;
  }

  getOrSet(initializer: () => T): T {
    if ("#value" in this) {
      return this.#value;
    }

    const calculatedValue = initializer();
    this.#value = calculatedValue;
    return calculatedValue;
  }
}

type MemoizedValueName =
  | "upperScore"
  | "lowerScore"
  | "totalScore"
  | "scoredUpperCategoriesCount"
  | "scoredLowerCategoriesCount"
  ;

class PlayerInfo {
  readonly upperScore = new MemoizedValue<number>();
  readonly lowerScore = new MemoizedValue<number>();
  readonly totalScore = new MemoizedValue<number>();
  readonly scoredUpperCategoriesCount = new MemoizedValue<number>();
  readonly scoredLowerCategoriesCount = new MemoizedValue<number>();

  constructor(readonly scorecard: Readonly<Scorecard>) {
  }
}

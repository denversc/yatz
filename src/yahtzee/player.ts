export type PlayerType = "human" | "ai";

export class Player {

  constructor(
    readonly name: string,
    readonly type: PlayerType,
  ) {
  }

  withName(name: string): Player {
    return new Player(name, this.type);
  }

  withType(type: PlayerType): Player {
    return new Player(this.name, type);
  }

  isHuman(): boolean {
    return this.type === "human";
  }

  isAI(): boolean {
    return this.type === "ai";
  }

}

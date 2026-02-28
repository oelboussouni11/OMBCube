declare module "cubejs" {
  class Cube {
    static initSolver(): void;
    static fromString(faceletString: string): Cube;
    static random(): Cube;
    solve(): string;
    move(algorithm: string): void;
    isSolved(): boolean;
    asString(): string;
  }
  export default Cube;
}

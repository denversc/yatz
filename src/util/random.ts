import { Alea } from './alea.ts';

/**
 * A pseudo-random number generator.
 */
export class Random {
  readonly seed: string | number;

  private alea: Alea;

  /**
   * Creates a new {@link Random} instance with the given seed.
   *
   * Instances of this class generate pseudo-random data. Any two {@link Random}
   * objects instantiated with the same `seed` are guaranteed to generate the
   * same sequence of numbers.
   *
   * @param seed the seed to use for random number generation.
   */
  constructor(seed: string | number) {
    this.seed = seed;
    this.alea = new Alea(seed);
  }

  /** Returns a random number in the range [0..1]. */
  next(): number {
    return this.alea.next();
  }

  /** Returns a random integer in the "safe" integer range. */
  safeInteger(): number {
    const positiveValue = this.next() > 0.5;
    if (positiveValue) {
      return Math.round(Number.MAX_SAFE_INTEGER * this.next());
    } else {
      return Math.round(Number.MIN_SAFE_INTEGER * this.next());
    }
  }

  /** Returns a random element from the given array. */
  elementFromArray<T>(choices: Readonly<Array<T>>): T {
    if (choices.length === 0) {
      throw new Error("choices.length === 0, but a non-zero length is required");
    }
    const index = Math.floor(this.next() * choices.length);
    return choices[index]!;
  }

  /** Returns a random alphanumeric character. */
  alphanumericCharacter(): string {
    const index = Math.floor(this.next() * ALPHANUMERIC_ALPHABET.length);
    return ALPHANUMERIC_ALPHABET[index]!;
  }

  /**
   * Returns a random string containing alphanumeric characters.
   */
  alphanumericString(parameters: { length: number }): string {
    const length = parameters.length;

    if (!Number.isInteger(length)) {
      throw new Error(`invalid length: ${length} (must be an integer)`);
    } else if (length <= 0) {
      throw new Error(`invalid length: ${length} (must be greater than zero)`);
    }

    let s = '';
    while (s.length < length) {
      s += this.alphanumericCharacter();
    }
    return s;
  }
}

const ALPHANUMERIC_ALPHABET = '23456789abcdefghjkmnopqrstuvwxyz' as const;

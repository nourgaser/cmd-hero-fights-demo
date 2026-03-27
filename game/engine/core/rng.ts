import seedrandom from "seedrandom";

export type BattleRng = {
  seed: string;
  nextFloat: () => number;
  nextIntInclusive: (minimum: number, maximum: number) => number;
};

export function createBattleRng(seed: string): BattleRng {
  const rng = seedrandom(seed);

  return {
    seed,
    nextFloat: () => rng(),
    nextIntInclusive: (minimum: number, maximum: number) => {
      if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
        throw new Error("nextIntInclusive requires integer boundaries.");
      }
      if (maximum < minimum) {
        throw new Error("nextIntInclusive requires maximum >= minimum.");
      }

      const span = maximum - minimum + 1;
      return minimum + Math.floor(rng() * span);
    },
  };
}

export function rollRange(
  battleRng: BattleRng,
  minimum: number,
  maximum: number,
): number {
  if (maximum < minimum) {
    throw new Error("rollRange requires maximum >= minimum.");
  }

  const span = maximum - minimum;
  return minimum + battleRng.nextFloat() * span;
}

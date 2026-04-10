import seedrandom from "seedrandom";

export type BattleRngCheckpoint = {
  seed: string;
  stepCount: number;
};

export type BattleRng = {
  seed: string;
  stepCount: number;
  nextFloat: () => number;
  nextIntInclusive: (minimum: number, maximum: number) => number;
  getCheckpoint: () => BattleRngCheckpoint;
};

export function createBattleRng(seed: string, startStepCount = 0): BattleRng {
  if (!Number.isInteger(startStepCount) || startStepCount < 0) {
    throw new Error("createBattleRng requires startStepCount to be a non-negative integer.");
  }

  const rng = seedrandom(seed);
  let stepCount = 0;

  for (let index = 0; index < startStepCount; index += 1) {
    rng();
  }
  stepCount = startStepCount;

  const nextFloat = () => {
    const value = rng();
    stepCount += 1;
    return value;
  };

  return {
    seed,
    get stepCount() {
      return stepCount;
    },
    nextFloat,
    nextIntInclusive: (minimum: number, maximum: number) => {
      if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
        throw new Error("nextIntInclusive requires integer boundaries.");
      }
      if (maximum < minimum) {
        throw new Error("nextIntInclusive requires maximum >= minimum.");
      }

      const span = maximum - minimum + 1;
      return minimum + Math.floor(nextFloat() * span);
    },
    getCheckpoint: () => ({
      seed,
      stepCount,
    }),
  };
}

export function createBattleRngFromCheckpoint(
  checkpoint: BattleRngCheckpoint,
): BattleRng {
  return createBattleRng(checkpoint.seed, checkpoint.stepCount);
}

export function advanceBattleRngSteps(
  battleRng: BattleRng,
  steps: number,
): void {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error("advanceBattleRngSteps requires steps to be a non-negative integer.");
  }

  for (let index = 0; index < steps; index += 1) {
    battleRng.nextFloat();
  }
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

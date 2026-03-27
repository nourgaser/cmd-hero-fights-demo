import type { BattleLuckState, EntityId } from "../../shared/models";

const LUCK_STEP_RATIO = 0.25;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function luckBiasForHero(
  luck: BattleLuckState,
  heroEntityId: EntityId,
): number {
  if (luck.balance === 0) {
    return 0;
  }

  const isAnchorHero = heroEntityId === luck.anchorHeroEntityId;
  return isAnchorHero ? luck.balance : -luck.balance;
}

export function applyLuckToRoll(options: {
  rawRoll: number;
  minimum: number;
  maximum: number;
  luck: BattleLuckState;
  rollingHeroEntityId: EntityId;
}): number {
  const { rawRoll, minimum, maximum, luck, rollingHeroEntityId } = options;

  if (maximum < minimum) {
    throw new Error("applyLuckToRoll requires maximum >= minimum.");
  }

  const range = maximum - minimum;
  if (range === 0) {
    return minimum;
  }

  const bias = luckBiasForHero(luck, rollingHeroEntityId);
  const shift = Math.round(range * LUCK_STEP_RATIO * Math.abs(bias));
  const adjusted = rawRoll + Math.sign(bias) * shift;

  return clamp(adjusted, minimum, maximum);
}

import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../../context";

export function handleResetLuckBalanceEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  if (effect.payload.kind !== "resetLuckBalance") {
    return { ok: false, reason: "handleResetLuckBalanceEffect received non-resetLuckBalance payload." };
  }

  const previousBalance = state.luck.balance;
  if (previousBalance === 0) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged,
      lastSummonedEntityId,
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      luck: {
        ...state.luck,
        balance: 0,
      },
    },
    events: [
      {
        kind: "luckBalanceChanged",
        sequence,
        anchorHeroEntityId: state.luck.anchorHeroEntityId,
        previousBalance,
        nextBalance: 0,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

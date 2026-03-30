import {
  type BattleEvent,
  type BattleState,
  type PressLuckAction,
} from "../../shared/models";

const LUCK_BALANCE_STEP = 1;
const LUCK_BALANCE_LIMIT = 4;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export type ResolvePressLuckResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
    }
  | {
      ok: false;
      state: BattleState;
      reason: string;
    };

export function resolvePressLuckAction(options: {
  state: BattleState;
  action: PressLuckAction;
  nextSequence: number;
}): ResolvePressLuckResult {
  const { state, action, nextSequence } = options;

  const actor = state.entitiesById[action.actorHeroEntityId];
  if (!actor || actor.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Press-luck actor hero was not found.",
    };
  }

  if (state.turn.activeHeroEntityId !== actor.entityId) {
    return {
      ok: false,
      state,
      reason: "Only the active hero can press luck.",
    };
  }

  const actorIsAnchor = actor.entityId === state.luck.anchorHeroEntityId;
  const delta = actorIsAnchor ? LUCK_BALANCE_STEP : -LUCK_BALANCE_STEP;
  const previousBalance = state.luck.balance;
  const nextBalance = clamp(
    previousBalance + delta,
    -LUCK_BALANCE_LIMIT,
    LUCK_BALANCE_LIMIT,
  );

  let sequence = nextSequence;
  const events: BattleEvent[] = [];

  const nextState: BattleState = {
    ...state,
    luck: {
      ...state.luck,
      balance: nextBalance,
    },
  };

  if (nextBalance !== previousBalance) {
    events.push({
      kind: "luckBalanceChanged",
      sequence,
      anchorHeroEntityId: state.luck.anchorHeroEntityId,
      previousBalance,
      nextBalance,
    });
    sequence += 1;
  }

  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence,
  };
}

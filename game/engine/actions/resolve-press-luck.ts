import {
  type BattleEvent,
  type BattleState,
  type PressLuckAction,
} from "../../shared/models";

const LUCK_BALANCE_STEP = 1;
const LUCK_BALANCE_LIMIT = 4;
const PRESS_LUCK_MOVE_COST = 3;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export type ResolvePressLuckResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      resultMessage: string;
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

  if (state.turn.pressLuckUsedThisTurn) {
    return {
      ok: false,
      state,
      reason: "Press luck can only be used once per turn.",
    };
  }

  if (actor.movePoints < PRESS_LUCK_MOVE_COST) {
    return {
      ok: false,
      state,
      reason: "Not enough move points to press luck.",
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
    entitiesById: {
      ...state.entitiesById,
      [actor.entityId]: {
        ...actor,
        movePoints: actor.movePoints - PRESS_LUCK_MOVE_COST,
      },
    },
    luck: {
      ...state.luck,
      balance: nextBalance,
    },
    turn: {
      ...state.turn,
      pressLuckUsedThisTurn: true,
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
    resultMessage:
      nextBalance !== previousBalance
        ? `Pressed luck. Balance ${previousBalance} -> ${nextBalance}.`
        : `Pressed luck. Balance stayed at ${nextBalance} (already at limit).`,
  };
}

import {
  type BattleEvent,
  type BattleState,
  type PressLuckAction,
} from "../../shared/models";
import {
  LUCK_BALANCE_LIMIT,
  LUCK_BALANCE_STEP,
  PRESS_LUCK_MOVE_COST,
} from "../../shared/game-constants";
import { resolveActiveActorHeroForAction } from "./shared-validation";

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

  const actorResolution = resolveActiveActorHeroForAction({
    state,
    actorHeroEntityId: action.actorHeroEntityId,
    notFoundReason: "Press-luck actor hero was not found.",
    inactiveReason: "Only the active hero can press luck.",
  });
  if (!actorResolution.ok) {
    return {
      ok: false,
      state,
      reason: actorResolution.reason,
    };
  }
  const actor = actorResolution.actorHero;

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

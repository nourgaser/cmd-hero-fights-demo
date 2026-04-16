import {
  type BattleAction,
  type BattleEvent,
  type BattleState,
} from "../../shared/models";
import { type BattleRng } from "../core/rng";
import {
  resolvePlayCardAction,
  type ResolvePlayCardResult,
} from "./resolve-play-card";
import {
  resolveEndTurnAction,
  type ResolveEndTurnResult,
} from "./resolve-end-turn";
import {
  resolvePressLuckAction,
  type ResolvePressLuckResult,
} from "./resolve-press-luck";
import {
  resolveBasicAttackAction,
  type ResolveBasicAttackResult,
} from "./resolve-basic-attack";
import {
  resolveUseEntityActiveAction,
  type ResolveUseEntityActiveResult,
} from "./resolve-use-entity-active";
import { removeDefeatedSummonedEntities } from "./entity-lifecycle";
import { resolveTriggeredListeners } from "./listeners";
import { annotateBattleStateWithActionOptions } from "./annotate-action-options";
import { type ContentRegistry } from "../core/content-registry";

export type ResolveActionResult =
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

function resolveGameOverState(state: BattleState): BattleState["gameOver"] {
  const defeatedHeroIds = (state.heroEntityIds as string[]).filter((heroEntityId) => {
    const hero = state.entitiesById[heroEntityId];
    return hero?.kind === "hero" && hero.currentHealth <= 0;
  });

  if (defeatedHeroIds.length === 0) {
    return null;
  }

  if (defeatedHeroIds.length === 1) {
    const loserHeroEntityId = defeatedHeroIds[0]!;
    const winnerHeroEntityId = (state.heroEntityIds as string[]).find(
      (heroEntityId) => heroEntityId !== loserHeroEntityId,
    );

    return {
      winnerHeroEntityId: winnerHeroEntityId ?? null,
      loserHeroEntityId,
      endedOnTurnNumber: state.turn.turnNumber,
    };
  }

  return {
    winnerHeroEntityId: null,
    loserHeroEntityId: null,
    endedOnTurnNumber: state.turn.turnNumber,
  };
}

function buildGameOverMessage(options: {
  state: BattleState;
  gameOver: NonNullable<BattleState["gameOver"]>;
}): string {
  const { state, gameOver } = options;

  if (!gameOver.winnerHeroEntityId || !gameOver.loserHeroEntityId) {
    return "Battle ended in a draw.";
  }

  const winner = state.entitiesById[gameOver.winnerHeroEntityId];
  if (winner?.kind === "hero") {
    return `${winner.heroDefinitionId} wins the battle.`;
  }

  return `${gameOver.winnerHeroEntityId} wins the battle.`;
}

export function resolveAction(options: {
  state: BattleState;
  action: BattleAction;
  nextSequence: number;
  battleRng: BattleRng;
  registry: ContentRegistry;
}): ResolveActionResult {
  const {
    state,
    action,
    nextSequence,
    battleRng,
    registry,
  } = options;

  if (state.gameOver) {
    return {
      ok: false,
      state,
      reason: "Battle is already over.",
    };
  }

  let baseResult: ResolveActionResult;

  switch (action.kind) {
    case "playCard": {
      const result: ResolvePlayCardResult = resolvePlayCardAction({
        state,
        action,
        registry,
        nextSequence,
        battleRng,
      });

      if (!result.ok) {
        return result;
      }
      baseResult = result;
      break;
    }
    case "endTurn": {
      const result: ResolveEndTurnResult = resolveEndTurnAction({
        state,
        action,
        nextSequence,
      });

      if (!result.ok) {
        return result;
      }
      baseResult = result;
      break;
    }
    case "pressLuck": {
      const result: ResolvePressLuckResult = resolvePressLuckAction({
        state,
        action,
        nextSequence,
      });

      if (!result.ok) {
        return result;
      }
      baseResult = result;
      break;
    }
    case "basicAttack": {
      const result: ResolveBasicAttackResult = resolveBasicAttackAction({
        state,
        action,
        nextSequence,
        battleRng,
        registry,
      });

      if (!result.ok) {
        return result;
      }
      baseResult = result;
      break;
    }
    case "useEntityActive": {
      const result: ResolveUseEntityActiveResult = resolveUseEntityActiveAction({
        state,
        action,
        nextSequence,
        battleRng,
        registry,
      });

      if (!result.ok) {
        return result;
      }
      baseResult = result;
      break;
    }
    default:
      return {
        ok: false,
        state,
        reason: "Unsupported action kind.",
      };
  }

  const cleanup = removeDefeatedSummonedEntities({
    state: baseResult.state,
    nextSequence: baseResult.nextSequence,
  });

  const eventsAfterCleanup = [...baseResult.events, ...cleanup.events];

  const listenerResolution = resolveTriggeredListeners({
    state: cleanup.state,
    seedActionEvents: eventsAfterCleanup,
    nextSequence: cleanup.nextSequence,
    battleRng,
    registry,
  });

  if (!listenerResolution.ok) {
    return {
      ok: false,
      state,
      reason: listenerResolution.reason,
    };
  }

  const nextGameOver = resolveGameOverState(listenerResolution.state);
  const nextState = nextGameOver
    ? {
        ...listenerResolution.state,
        gameOver: nextGameOver,
      }
    : listenerResolution.state;

  return {
    ok: true,
    state: annotateBattleStateWithActionOptions({
      state: nextState,
      registry,
    }),
    events: [...eventsAfterCleanup, ...listenerResolution.events],
    nextSequence: listenerResolution.nextSequence,
    resultMessage: nextGameOver
      ? `${baseResult.resultMessage} ${buildGameOverMessage({ state: nextState, gameOver: nextGameOver })}`
      : baseResult.resultMessage,
  };
}

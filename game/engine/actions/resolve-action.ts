import {
  type BattleAction,
  type BattleEvent,
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
  type SummonedEntityKind,
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
  type EntityActiveProfile,
  type ResolveUseEntityActiveResult,
} from "./resolve-use-entity-active";
import { type SummonedEntityBlueprint } from "./effects/execute-card-effect";
import { type HeroDefinition } from "../../shared/models";
import { removeDefeatedSummonedEntities } from "./entity-lifecycle";
import { resolveTriggeredListeners } from "./listeners";
import { annotateBattleStateWithActionOptions } from "./annotate-action-options";

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

export function resolveAction(options: {
  state: BattleState;
  action: BattleAction;
  nextSequence: number;
  battleRng: BattleRng;
  cardDefinitionsById: Record<string, CardDefinition>;
  heroDefinitionsById: Record<string, HeroDefinition>;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
  resolveSummonedEntityBlueprint: (
    entityDefinitionId: string,
    kind: SummonedEntityKind,
  ) => SummonedEntityBlueprint | undefined;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) => EntityActiveProfile | undefined;
}): ResolveActionResult {
  const {
    state,
    action,
    nextSequence,
    battleRng,
    cardDefinitionsById,
    heroDefinitionsById,
    createSummonedEntityId,
    resolveSummonFootprint,
    resolveSummonedEntityBlueprint,
    resolveEntityActiveProfile,
  } = options;

  let baseResult: ResolveActionResult;

  switch (action.kind) {
    case "playCard": {
      const result: ResolvePlayCardResult = resolvePlayCardAction({
        state,
        action,
        cardDefinitionsById,
        nextSequence,
        battleRng,
        createSummonedEntityId,
        resolveSummonFootprint,
        resolveSummonedEntityBlueprint,
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
        heroDefinitionsById,
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
        resolveEntityActiveProfile,
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
    createSummonedEntityId,
    resolveSummonedEntityBlueprint,
  });

  if (!listenerResolution.ok) {
    return {
      ok: false,
      state,
      reason: listenerResolution.reason,
    };
  }

  return {
    ok: true,
    state: annotateBattleStateWithActionOptions({
      state: listenerResolution.state,
      cardDefinitionsById,
      resolveSummonFootprint,
      resolveEntityActiveProfile,
    }),
    events: [...eventsAfterCleanup, ...listenerResolution.events],
    nextSequence: listenerResolution.nextSequence,
    resultMessage: baseResult.resultMessage,
  };
}

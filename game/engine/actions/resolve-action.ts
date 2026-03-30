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
import { type SummonedEntityBlueprint } from "./effects/execute-card-effect.ts";
import { type HeroDefinition } from "../../shared/models";

export type ResolveActionResult =
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
  resolveSummonedEntityBlueprint?: (
    entityDefinitionId: string,
    kind: SummonedEntityKind,
  ) => SummonedEntityBlueprint | undefined;
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
  } = options;

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

      return result;
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

      return result;
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

      return result;
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

      return result;
    }
    case "useEntityActive":
      return {
        ok: false,
        state,
        reason: `${action.kind} is not implemented yet in resolveAction.`,
      };
    default:
      return {
        ok: false,
        state,
        reason: "Unsupported action kind.",
      };
  }
}

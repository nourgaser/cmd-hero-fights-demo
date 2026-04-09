import {
  SingleCellFootprint,
  setOccupantFootprint,
} from "../../../../shared/models";
import { MOVE_POINTS_CAP } from "../../../../shared/game-constants";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";

export function handleSummonEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, action, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "summonEntity") {
    return { ok: false, reason: "handleSummonEffect received non-summon payload." };
  }

  const anchor = action.selection.targetPosition;
  if (!anchor) {
    return { ok: false, reason: "Summon effect execution requires a selected target position." };
  }

  const blueprint = context.resolveSummonedEntityBlueprint?.(
    effect.payload.entityDefinitionId,
    effect.payload.entityKind,
  );
  if (!blueprint) {
    return { ok: false, reason: "Summon effect execution is missing entity blueprint resolution." };
  }

  const summonedEntityId = context.createSummonedEntityId({
    ownerHeroEntityId: actorHero.entityId,
    entityDefinitionId: effect.payload.entityDefinitionId,
    sequence,
  });

  const footprint = blueprint.footprint ?? SingleCellFootprint;
  const maxMovesPerTurn = Math.min(blueprint.maxMovesPerTurn ?? blueprint.remainingMoves, MOVE_POINTS_CAP);
  const remainingMoves = Math.min(blueprint.remainingMoves, maxMovesPerTurn);
  const moveRefreshIntervalTurns = Math.max(1, Math.floor(blueprint.moveRefreshIntervalTurns ?? 1));
  const ownerTurnsUntilMoveRefresh = Math.max(0, moveRefreshIntervalTurns - 1);

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [summonedEntityId]: {
          kind: blueprint.kind,
          entityId: summonedEntityId,
          ownerHeroEntityId: actorHero.entityId,
          battlefieldSide: actorHero.battlefieldSide,
          anchorPosition: anchor,
          footprint,
          definitionCardId: blueprint.definitionCardId,
          keywordIds: blueprint.keywordIds ?? [],
          maxHealth: blueprint.maxHealth,
          currentHealth: blueprint.maxHealth,
          armor: blueprint.armor,
          magicResist: blueprint.magicResist,
          attackDamage: blueprint.attackDamage,
          abilityPower: blueprint.abilityPower,
          criticalChance: blueprint.criticalChance,
          criticalMultiplier: blueprint.criticalMultiplier,
          dodgeChance: blueprint.dodgeChance,
          baseSharpness: blueprint.baseSharpness ?? 0,
          maxMovesPerTurn,
          remainingMoves,
          moveRefreshIntervalTurns,
          ownerTurnsUntilMoveRefresh,
        },
      },
      battlefieldOccupancy: setOccupantFootprint(
        state.battlefieldOccupancy,
        anchor,
        footprint,
        {
          kind: blueprint.kind,
          entityId: summonedEntityId,
          ownerHeroEntityId: actorHero.entityId,
        },
      ),
    },
    events: [
      {
        kind: "entitySummoned",
        sequence,
        ownerHeroEntityId: actorHero.entityId,
        summonedEntityId,
        position: anchor,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId: summonedEntityId,
  };
}

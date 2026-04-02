import {
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
  type Position,
  SingleCellFootprint,
} from "../../shared/models";
import { computeValidTargetsForCard } from "./compute-valid-targets";
import { validatePlacementForHeroSide } from "../battlefield/placement";

export function annotateBattleStateWithActiveHandTargets(options: {
  state: BattleState;
  cardDefinitionsById: Record<string, CardDefinition>;
  resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) =>
    | {
        moveCost: number;
      }
    | undefined;
}): BattleState {
  const { state, cardDefinitionsById, resolveSummonFootprint, resolveEntityActiveProfile } = options;
  const activeHeroEntityId = state.turn.activeHeroEntityId;

  function resolveValidPlacementPositions(options: {
    cardDef: CardDefinition;
    actorHeroEntityId: string;
  }): Position[] {
    const summonEffects = options.cardDef.effects.filter(
      (effect) => effect.payload.kind === "summonEntity",
    );

    if (summonEffects.length !== 1) {
      return [];
    }

    const summonEffect = summonEffects[0]!;
    if (summonEffect.payload.kind !== "summonEntity") {
      return [];
    }

    const footprint =
      resolveSummonFootprint?.(summonEffect.payload.entityDefinitionId) ?? SingleCellFootprint;

    const { rows, columns } = state.battlefieldOccupancy.dimensions;
    const validPositions: Position[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const anchorPosition = { row, column };
        const validation = validatePlacementForHeroSide({
          state,
          heroEntityId: options.actorHeroEntityId,
          anchorPosition,
          footprint,
        });
        if (validation.ok) {
          validPositions.push(anchorPosition);
        }
      }
    }

    return validPositions;
  }

  const nextEntitiesById: BattleState["entitiesById"] = {};

  for (const [entityId, entity] of Object.entries(state.entitiesById)) {
    if (entity.kind !== "hero") {
      nextEntitiesById[entityId] = entity;
      continue;
    }

    const isActiveHero = entity.entityId === activeHeroEntityId;

    const nextHandCards = entity.handCards.map((handCard) => {
      const baseHandCard = {
        id: handCard.id,
        cardDefinitionId: handCard.cardDefinitionId,
      };

      if (!isActiveHero) {
        return baseHandCard;
      }

      const cardDef = cardDefinitionsById[handCard.cardDefinitionId];
      if (!cardDef) {
        return baseHandCard;
      }

      const validTargetEntityIds =
        cardDef.targeting === "none"
          ? undefined
          : computeValidTargetsForCard({
              cardDef,
              actorHero: entity,
              state,
            });

      const validPlacementPositions = resolveValidPlacementPositions({
        cardDef,
        actorHeroEntityId: entity.entityId,
      });

      const hasTargetingRequirement = cardDef.targeting !== "none";
      const hasPlacementRequirement = validPlacementPositions.length > 0;
      const hasValidTargetSelection = !hasTargetingRequirement || (validTargetEntityIds?.length ?? 0) > 0;
      const hasValidPlacementSelection = !cardDef.effects.some((effect) => effect.payload.kind === "summonEntity") || hasPlacementRequirement;
      const hasMoveCost = entity.movePoints >= cardDef.moveCost;
      const isPlayable = hasMoveCost && hasValidTargetSelection && hasValidPlacementSelection;

      return {
        ...baseHandCard,
        validTargetEntityIds,
        validPlacementPositions: validPlacementPositions.length > 0 ? validPlacementPositions : undefined,
        isPlayable,
      };
    });

    nextEntitiesById[entityId] = {
      ...entity,
      handCards: nextHandCards,
      basicAttackTargetEntityIds: isActiveHero
        ? Object.values(state.entitiesById)
            .filter((entry) => entry.battlefieldSide !== entity.battlefieldSide)
            .map((entry) => entry.entityId)
        : undefined,
      entityActiveOptions: isActiveHero
        ? Object.values(state.entitiesById)
            .map((entry) => {
              if (entry.kind !== "weapon" && entry.kind !== "companion") {
                return null;
              }
              if (entry.ownerHeroEntityId !== entity.entityId) {
                return null;
              }

              const profile = resolveEntityActiveProfile?.({
                sourceDefinitionCardId: entry.definitionCardId,
                sourceKind: entry.kind,
              });
              if (!profile || entry.remainingMoves < profile.moveCost) {
                return null;
              }

              const validTargetEntityIds = Object.values(state.entitiesById)
                .filter((target) => target.battlefieldSide !== entry.battlefieldSide)
                .map((target) => target.entityId);

              return {
                sourceEntityId: entry.entityId,
                validTargetEntityIds,
              };
            })
            .filter((entry): entry is { sourceEntityId: string; validTargetEntityIds: string[] } => !!entry)
        : undefined,
    };
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
}
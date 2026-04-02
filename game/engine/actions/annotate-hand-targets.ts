import type { BattleState, CardDefinition } from "../../shared/models";
import { computeValidTargetsForCard } from "./compute-valid-targets";

export function annotateBattleStateWithActiveHandTargets(options: {
  state: BattleState;
  cardDefinitionsById: Record<string, CardDefinition>;
}): BattleState {
  const { state, cardDefinitionsById } = options;
  const activeHeroEntityId = state.turn.activeHeroEntityId;

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
      if (!cardDef || cardDef.targeting === "none") {
        return baseHandCard;
      }

      return {
        ...baseHandCard,
        validTargetEntityIds: computeValidTargetsForCard({
          cardDef,
          actorHero: entity,
          state,
        }),
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
    };
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
}
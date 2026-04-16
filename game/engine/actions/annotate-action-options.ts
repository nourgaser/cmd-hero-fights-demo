import {
  type BattleState,
} from "../../shared/models";
import {
  annotateHeroHandCards,
  resolveBasicAttackTargetEntityIds,
  resolveEntityActiveOptions,
} from "./action-options";
import { type ContentRegistry } from "../core/content-registry";

export function annotateBattleStateWithActionOptions(options: {
  state: BattleState;
  registry: ContentRegistry;
}): BattleState {
  const { state, registry } = options;

  if (state.gameOver) {
    const nextEntitiesById: BattleState["entitiesById"] = {};

    for (const [entityId, entity] of Object.entries(state.entitiesById)) {
      if (entity.kind !== "hero") {
        nextEntitiesById[entityId] = entity;
        continue;
      }

      nextEntitiesById[entityId] = {
        ...entity,
        handCards: entity.handCards.map((handCard) => ({
          id: handCard.id,
          cardDefinitionId: handCard.cardDefinitionId,
          isPlayable: false,
          validTargetEntityIds: undefined,
          validPlacementPositions: undefined,
        })),
        basicAttackTargetEntityIds: [],
        entityActiveOptions: [],
      };
    }

    return {
      ...state,
      entitiesById: nextEntitiesById,
    };
  }

  const activeHeroEntityId = state.turn.activeHeroEntityId;

  const nextEntitiesById: BattleState["entitiesById"] = {};

  for (const [entityId, entity] of Object.entries(state.entitiesById)) {
    if (entity.kind !== "hero") {
      nextEntitiesById[entityId] = entity;
      continue;
    }

    const isActiveHero = entity.entityId === activeHeroEntityId;

    const nextHandCards = annotateHeroHandCards({
      state,
      actorHero: entity,
      isActiveHero,
      registry,
    });

    nextEntitiesById[entityId] = {
      ...entity,
      handCards: nextHandCards,
      basicAttackTargetEntityIds: resolveBasicAttackTargetEntityIds({
        state,
        actorHero: entity,
        isActiveHero,
      }),
      entityActiveOptions: resolveEntityActiveOptions({
        state,
        actorHero: entity,
        isActiveHero,
        registry,
      }),
    };
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
}
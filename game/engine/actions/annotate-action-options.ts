import {
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
} from "../../shared/models";
import {
  annotateHeroHandCards,
  resolveBasicAttackTargetEntityIds,
  resolveEntityActiveOptions,
} from "./action-options";

export function annotateBattleStateWithActionOptions(options: {
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
      cardDefinitionsById,
      resolveSummonFootprint,
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
        resolveEntityActiveProfile,
      }),
    };
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
}
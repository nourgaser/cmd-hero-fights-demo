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
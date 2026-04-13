import type { BattleState, EffectTargetSelector } from "../../../../../shared/models";
import { resolveAdjacentAllyEntityIds } from "../../../../battlefield/adjacency";

export function resolvePassiveRuleTargetEntityIds(options: {
  state: BattleState;
  sourceEntityId: string;
  targetSelector: EffectTargetSelector;
}): string[] {
  const { state, sourceEntityId, targetSelector } = options;
  const sourceEntity = state.entitiesById[sourceEntityId];
  if (!sourceEntity) {
    return [];
  }

  const sourceOwnerHeroEntityId =
    sourceEntity.kind === "hero" ? sourceEntity.entityId : sourceEntity.ownerHeroEntityId;

  switch (targetSelector) {
    case "selfHero":
    case "sourceOwnerHero":
      return [sourceOwnerHeroEntityId];
    case "sourceEntity":
      return [sourceEntityId];
    case "sourceEntityAdjacentAllies":
      return resolveAdjacentAllyEntityIds({ state, targetEntityId: sourceEntityId });
    case "sourceOwnerAllies":
      return Object.values(state.entitiesById)
        .filter((entity) => {
          if (entity.kind === "hero") {
            return entity.entityId === sourceOwnerHeroEntityId;
          }

          return entity.ownerHeroEntityId === sourceOwnerHeroEntityId;
        })
        .map((entity) => entity.entityId);
    case "sourceOwnerHeroAndCompanions":
      return Object.values(state.entitiesById)
        .filter((entity) =>
          entity.kind === "hero"
            ? entity.entityId === sourceOwnerHeroEntityId
            : entity.kind === "companion" && entity.ownerHeroEntityId === sourceOwnerHeroEntityId,
        )
        .map((entity) => entity.entityId);
    default:
      return [];
  }
}

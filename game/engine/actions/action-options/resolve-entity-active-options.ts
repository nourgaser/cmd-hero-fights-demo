import {
  type BattleState,
  type HeroEntityState,
} from "../../../shared/models";
import { resolveAttackTargetEntityIdsWithTaunt } from "../../battlefield/taunt";
import { type ContentRegistry } from "../../core/content-registry";

export function resolveEntityActiveOptions(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  isActiveHero: boolean;
  registry: ContentRegistry;
}): HeroEntityState["entityActiveOptions"] {
  const { state, actorHero, isActiveHero, registry } = options;

  if (!isActiveHero) {
    return undefined;
  }

  return Object.values(state.entitiesById)
    .map((entry) => {
      if (entry.kind !== "weapon" && entry.kind !== "companion") {
        return null;
      }
      if (entry.ownerHeroEntityId !== actorHero.entityId) {
        return null;
      }

      const profile = registry.resolveEntityActiveProfile({
        sourceDefinitionCardId: entry.definitionCardId,
        sourceKind: entry.kind,
      });
      if (!profile || entry.remainingMoves < profile.moveCost) {
        return null;
      }

      const validTargetEntityIds =
        profile.kind === "effect"
          ? []
          : resolveAttackTargetEntityIdsWithTaunt({
              state,
              attackerEntityId: entry.entityId,
            });

      return {
        sourceEntityId: entry.entityId,
        validTargetEntityIds,
      };
    })
    .filter((entry): entry is { sourceEntityId: string; validTargetEntityIds: string[] } => !!entry);
}

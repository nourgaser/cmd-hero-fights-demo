import {
  type BattleState,
  type HeroEntityState,
} from "../../../shared/models";

export function resolveEntityActiveOptions(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  isActiveHero: boolean;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) =>
    | {
        moveCost: number;
      }
    | undefined;
}): HeroEntityState["entityActiveOptions"] {
  const { state, actorHero, isActiveHero, resolveEntityActiveProfile } = options;

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
    .filter((entry): entry is { sourceEntityId: string; validTargetEntityIds: string[] } => !!entry);
}

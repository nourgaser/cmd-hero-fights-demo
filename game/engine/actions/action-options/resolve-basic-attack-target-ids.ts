import {
  type BattleState,
  type HeroEntityState,
} from "../../../shared/models";

export function resolveBasicAttackTargetEntityIds(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  isActiveHero: boolean;
}): string[] | undefined {
  const { state, actorHero, isActiveHero } = options;

  if (!isActiveHero) {
    return undefined;
  }

  return Object.values(state.entitiesById)
    .filter((entry) => entry.battlefieldSide !== actorHero.battlefieldSide)
    .map((entry) => entry.entityId);
}

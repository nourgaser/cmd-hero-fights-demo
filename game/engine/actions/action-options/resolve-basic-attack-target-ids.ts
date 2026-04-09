import {
  type BattleState,
  type HeroEntityState,
} from "../../../shared/models";
import { resolveAttackTargetEntityIdsWithTaunt } from "../../battlefield/taunt";

export function resolveBasicAttackTargetEntityIds(options: {
  state: BattleState;
  actorHero: HeroEntityState;
  isActiveHero: boolean;
}): string[] | undefined {
  const { state, actorHero, isActiveHero } = options;

  if (!isActiveHero) {
    return undefined;
  }

  return resolveAttackTargetEntityIdsWithTaunt({
    state,
    attackerEntityId: actorHero.entityId,
  });
}

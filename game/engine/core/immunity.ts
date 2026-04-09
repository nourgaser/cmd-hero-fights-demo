import type { BattleState } from "../../shared/models";
import { getEffectiveImmune } from "../actions/effects/get-effective-number";

export function isEntityImmuneToDamage(options: {
  state: BattleState;
  targetEntityId: string;
}): boolean {
  const target = options.state.entitiesById[options.targetEntityId];
  if (!target) {
    return false;
  }

  return getEffectiveImmune({
    state: options.state,
    targetEntityId: options.targetEntityId,
    baseImmune: 0,
  }).effectiveValue > 0;
}
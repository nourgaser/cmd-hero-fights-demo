import {
  type BattleState,
} from "../../../shared/models";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
  type SummonedEntityBlueprint,
} from "./context";
import { executeEffect } from "./handlers/registry";

export { type SummonedEntityBlueprint };
export { type ExecuteCardEffectResult };

export function executeCardEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  return executeEffect(context);
}

export function resolveActorHeroForEffect(options: {
  state: BattleState;
  actorHeroEntityId: string;
}):
  | { ok: true; actorHero: EffectExecutionContext["actorHero"] }
  | { ok: false; reason: string } {
  const actorEntity = options.state.entitiesById[options.actorHeroEntityId];
  if (!actorEntity || actorEntity.kind !== "hero") {
    return { ok: false, reason: "Acting hero was not found during effect execution." };
  }

  return {
    ok: true,
    actorHero: actorEntity,
  };
}

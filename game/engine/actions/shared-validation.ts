import {
  type BattleState,
  type HeroEntityState,
} from "../../shared/models";

type ResolveActorHeroResult =
  | {
      ok: true;
      actorHero: HeroEntityState;
    }
  | {
      ok: false;
      reason: string;
    };

export function resolveActorHeroForAction(options: {
  state: BattleState;
  actorHeroEntityId: string;
  notFoundReason: string;
}): ResolveActorHeroResult {
  const actorEntity = options.state.entitiesById[options.actorHeroEntityId];
  if (!actorEntity || actorEntity.kind !== "hero") {
    return {
      ok: false,
      reason: options.notFoundReason,
    };
  }

  return {
    ok: true,
    actorHero: actorEntity,
  };
}

export function resolveActiveActorHeroForAction(options: {
  state: BattleState;
  actorHeroEntityId: string;
  notFoundReason: string;
  inactiveReason: string;
}): ResolveActorHeroResult {
  const actorResolution = resolveActorHeroForAction({
    state: options.state,
    actorHeroEntityId: options.actorHeroEntityId,
    notFoundReason: options.notFoundReason,
  });

  if (!actorResolution.ok) {
    return actorResolution;
  }

  if (options.state.turn.activeHeroEntityId !== actorResolution.actorHero.entityId) {
    return {
      ok: false,
      reason: options.inactiveReason,
    };
  }

  return actorResolution;
}
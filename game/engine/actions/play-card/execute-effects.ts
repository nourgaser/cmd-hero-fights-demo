import {
  type BattleEvent,
  type BattleState,
  type CardDefinition,
  type EffectDefinition,
  type PlayCardAction,
} from "../../../shared/models";
import { type BattleRng } from "../../core/rng";
import {
  executeCardEffect,
  resolveActorHeroForEffect,
  type SummonedEntityBlueprint,
} from "../effects/execute-card-effect";

export type ExecutePlayCardEffectsResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
    }
  | {
      ok: false;
      reason: string;
    };

export function executePlayCardEffects(options: {
  state: BattleState;
  action: PlayCardAction;
  card: CardDefinition;
  actorHeroEntityId: string;
  nextSequence: number;
  battleRng: BattleRng;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonedEntityBlueprint: (
    entityDefinitionId: string,
    kind: "weapon" | "totem" | "companion",
  ) => SummonedEntityBlueprint | undefined;
}): ExecutePlayCardEffectsResult {
  const {
    state,
    action,
    card,
    actorHeroEntityId,
    nextSequence,
    battleRng,
    createSummonedEntityId,
    resolveSummonedEntityBlueprint,
  } = options;

  let nextState = state;
  let sequence = nextSequence;
  const events: BattleEvent[] = [];
  let lastDamageWasDodged: boolean | undefined;
  let lastSummonedEntityId: string | undefined;

  for (const effect of card.effects as EffectDefinition[]) {
    const actorResolution = resolveActorHeroForEffect({
      state: nextState,
      actorHeroEntityId,
    });
    if (!actorResolution.ok) {
      return {
        ok: false,
        reason: (actorResolution as any).reason,
      };
    }

    const execution = executeCardEffect({
      state: nextState,
      effect,
      action,
      actorHero: actorResolution.actorHero,
      sequence,
      battleRng,
      triggerEvent: undefined,
      lastDamageWasDodged,
      lastSummonedEntityId,
      effectSourceEntityId: actorHeroEntityId,
      createSummonedEntityId,
      resolveSummonedEntityBlueprint,
    });

    if (!execution.ok) {
      return {
        ok: false,
        reason: execution.reason,
      };
    }

    nextState = execution.state;
    events.push(...execution.events);
    sequence = execution.nextSequence;
    lastDamageWasDodged = execution.lastDamageWasDodged;
    lastSummonedEntityId = execution.lastSummonedEntityId;
  }

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence,
  };
}

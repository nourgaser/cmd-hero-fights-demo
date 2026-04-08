import type { BattleEvent } from "../../../../shared/models";
import { createReactiveBulwarkAura } from "../../../core/aura";
import { type EffectExecutionContext, type ExecuteCardEffectResult } from "../context";
import { targetEntityIdFromSelector } from "../targeting";

type ApplyAuraPayload = {
  kind: "applyAura";
  target: "sourceOwnerHero" | "selfHero";
  auraKind: "reactiveBulwarkResistance";
  durationTurns: number;
  baseResistanceBonus: number;
  amplifiedResistanceBonus: number;
};

export function handleApplyAuraEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  if (context.effect.payload.kind !== "applyAura") {
    return { ok: false, reason: "handleApplyAuraEffect received unsupported payload." };
  }

  const payload = context.effect.payload as ApplyAuraPayload;
  const targetId = targetEntityIdFromSelector({
    selector: payload.target,
    action: context.action,
    actorHero: context.actorHero,
    state: context.state,
    triggerEvent: context.triggerEvent,
  });

  if (!targetId) {
    return { ok: false, reason: "applyAura requires a valid target." };
  }

  const target = context.state.entitiesById[targetId];
  if (!target || target.kind !== "hero") {
    return { ok: false, reason: "applyAura currently supports hero targets only." };
  }

  const aura = createReactiveBulwarkAura({
    ownerHeroEntityId: target.entityId,
    sourceEffectId: context.effect.id,
    sequence: context.sequence,
    currentTurnNumber: context.state.turn.turnNumber,
    durationTurns: payload.durationTurns,
    baseResistanceBonus: payload.baseResistanceBonus,
    amplifiedResistanceBonus: payload.amplifiedResistanceBonus,
  });

  const activeStackCount = context.state.activeAuras.filter(
    (entry) =>
      entry.ownerHeroEntityId === target.entityId
      && entry.kind === aura.kind
      && entry.expiresOnTurnNumber > context.state.turn.turnNumber,
  ).length + 1;

  return {
    ok: true,
    state: {
      ...context.state,
      activeAuras: [...context.state.activeAuras, aura],
    },
    events: [
      {
        kind: "auraApplied",
        sequence: context.sequence,
        auraId: aura.id,
        ownerHeroEntityId: target.entityId,
        auraKind: aura.kind,
        expiresOnTurnNumber: aura.expiresOnTurnNumber,
        stackCount: activeStackCount,
      },
    ] as BattleEvent[],
    nextSequence: context.sequence + 1,
    lastDamageWasDodged: context.lastDamageWasDodged,
    lastSummonedEntityId: context.lastSummonedEntityId,
  };
}
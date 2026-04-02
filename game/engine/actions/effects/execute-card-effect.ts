import {
  type BattleState,
} from "../../../shared/models";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
  type SummonedEntityBlueprint,
} from "./context";
import { handleDealDamageEffect, handleHealEffect } from "./handlers/combat";
import {
  handleAddListenerEffect,
  handleDrawCardsEffect,
  handleModifyAttackDamageWhileSourcePresentEffect,
  handleRemoveListenerEffect,
  handleRefundMoveCostEffect,
} from "./handlers/economy";
import { handleGainArmorEffect, handleGainMagicResistEffect, handleGainAttackDamageEffect } from "./handlers/stats";
import { handleSummonEffect } from "./handlers/summon";

type EffectHandler = (context: EffectExecutionContext) => ExecuteCardEffectResult;

const effectHandlers = {
  summonEntity: handleSummonEffect,
  gainArmor: handleGainArmorEffect,
  loseArmor: handleGainArmorEffect,
  gainMagicResist: handleGainMagicResistEffect,
  loseMagicResist: handleGainMagicResistEffect,
  gainAttackDamage: handleGainAttackDamageEffect,
  loseAttackDamage: handleGainAttackDamageEffect,
  drawCards: handleDrawCardsEffect,
  heal: handleHealEffect,
  dealDamage: handleDealDamageEffect,
  refundMoveCost: handleRefundMoveCostEffect,
  modifyAttackDamageWhileSourcePresent: handleModifyAttackDamageWhileSourcePresentEffect,
  addListener: handleAddListenerEffect,
  removeListener: handleRemoveListenerEffect,
} satisfies Record<string, EffectHandler>;

export { type SummonedEntityBlueprint };
export { type ExecuteCardEffectResult };

export function executeCardEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  const handler = effectHandlers[context.effect.payload.kind as keyof typeof effectHandlers];
  if (!handler) {
    return { ok: false, reason: `Unsupported effect kind: ${String(context.effect.payload.kind)}` };
  }
  return handler(context);
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

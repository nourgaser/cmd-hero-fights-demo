import { type EffectExecutionContext, type ExecuteCardEffectResult } from "../context";
import { handleHealEffect, handleGrantHealthEffect } from "./heal";
import { handleDealDamageEffect, handleReflectDamageEffect } from "./damage";
import {
  handleDestroyArmorAndDealPerArmorToEnemyHeroEffect,
  handleDestroySelfArmorAndDealPerArmorToTargetEffect,
} from "./armor";
import {
  handleAddListenerEffect,
  handleDrawCardsEffect,
  handleRemoveListenerEffect,
  handleResetLuckBalanceEffect,
  handleRefundMoveCostEffect,
} from "./economy";
import { handleApplyAuraEffect } from "./aura";
import { handleModifyStatEffect } from "./stats";
import { handleSummonEffect } from "./summon";

export type EffectHandler = (context: EffectExecutionContext) => ExecuteCardEffectResult;

export const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  summonEntity: handleSummonEffect,
  modifyStat: handleModifyStatEffect,
  drawCards: handleDrawCardsEffect,
  heal: handleHealEffect,
  grantHealth: handleGrantHealthEffect,
  reflectDamage: handleReflectDamageEffect,
  dealDamage: handleDealDamageEffect,
  destroyArmorAndDealPerArmorToEnemyHero: handleDestroyArmorAndDealPerArmorToEnemyHeroEffect,
  destroySelfArmorAndDealPerArmorToTarget: handleDestroySelfArmorAndDealPerArmorToTargetEffect,
  resetLuckBalance: handleResetLuckBalanceEffect,
  refundMoveCost: handleRefundMoveCostEffect,
  applyAura: handleApplyAuraEffect,
  addListener: handleAddListenerEffect,
  removeListener: handleRemoveListenerEffect,
};

export function executeEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  const handler = EFFECT_HANDLERS[context.effect.payload.kind];
  if (!handler) {
    return {
      ok: false,
      reason: `No effect handler found for kind: ${context.effect.payload.kind}`,
    };
  }
  return handler(context);
}

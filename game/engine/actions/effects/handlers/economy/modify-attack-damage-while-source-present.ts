import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../../context";

export function handleModifyAttackDamageWhileSourcePresentEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  if (context.effect.payload.kind !== "modifyAttackDamageWhileSourcePresent") {
    return {
      ok: false,
      reason: "handleModifyAttackDamageWhileSourcePresentEffect received unsupported payload.",
    };
  }

  return {
    ok: false,
    reason: "modifyAttackDamageWhileSourcePresent is not implemented yet.",
  };
}

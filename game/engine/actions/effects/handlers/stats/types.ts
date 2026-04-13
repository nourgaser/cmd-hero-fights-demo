import type { EffectTargetSelector } from "../../../../../shared/models";

export type StatKey =
  | "armor"
  | "magicResist"
  | "attackDamage"
  | "abilityPower"
  | "dodgeChance"
  | "attackFlatBonusDamage"
  | "basicAttackFlatBonusDamage"
  | "moveCapacity"
  | "attackHealOnAttack"
  | "sharpness"
  | "basicAttackSharpness"
  | "useEntityActive.maximum"
  | "immune";

export type ModifyStatPayload = {
  kind: "modifyStat";
  target: EffectTargetSelector;
  stat: StatKey;
  amount?: number;
  amountFromSourceStat?: string;
  amountFromSourceSelector?: "sourceEntity" | "sourceOwnerHero" | "selfHero";
  duration?: "persistent" | "untilSourceRemoved";
  changeKind?: "apply" | "removeMatching";
  sourceBinding?: "effectSource" | "actorHero" | "lastSummonedEntity" | "selectedTarget";
};

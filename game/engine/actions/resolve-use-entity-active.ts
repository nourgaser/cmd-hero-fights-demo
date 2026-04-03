import {
  type BattleEvent,
  type BattleState,
  type DamageType,
  type UseEntityActiveAction,
} from "../../shared/models";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { computeScaledDamageRange } from "../core/damage-range";
import { applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";
import { resolveActiveActorHeroForAction } from "./shared-validation";

export type EntityActiveProfile = {
  moveCost: number;
  minimumDamage: number;
  maximumDamage: number;
  damageType: DamageType;
  attackDamageScaling: number;
  abilityPowerScaling: number;
  canBeDodged: boolean;
};

export type ResolveUseEntityActiveResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      resultMessage: string;
    }
  | {
      ok: false;
      state: BattleState;
      reason: string;
    };

export function resolveUseEntityActiveAction(options: {
  state: BattleState;
  action: UseEntityActiveAction;
  nextSequence: number;
  battleRng: BattleRng;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) => EntityActiveProfile | undefined;
}): ResolveUseEntityActiveResult {
  const { state, action, nextSequence, battleRng, resolveEntityActiveProfile } = options;

  const actorResolution = resolveActiveActorHeroForAction({
    state,
    actorHeroEntityId: action.actorHeroEntityId,
    notFoundReason: "Acting hero was not found.",
    inactiveReason: "Only the active hero can use an entity active.",
  });
  if (!actorResolution.ok) {
    return {
      ok: false,
      state,
      reason: actorResolution.reason,
    };
  }
  const actorHero = actorResolution.actorHero;

  const source = state.entitiesById[action.sourceEntityId];
  if (!source || source.kind === "hero") {
    return {
      ok: false,
      state,
      reason: "useEntityActive currently supports summoned entity sources only.",
    };
  }

  if (source.kind === "totem") {
    return {
      ok: false,
      state,
      reason: "Totems cannot trigger active actions.",
    };
  }

  if (source.ownerHeroEntityId !== actorHero.entityId) {
    return {
      ok: false,
      state,
      reason: "The source entity does not belong to the acting hero.",
    };
  }

  const targetId = action.selection.targetEntityId;
  if (!targetId) {
    return {
      ok: false,
      state,
      reason: "useEntityActive requires a selected target entity.",
    };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target was not found.",
    };
  }

  if (target.battlefieldSide === source.battlefieldSide) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target must be on the opposing side.",
    };
  }

  const profile = resolveEntityActiveProfile?.({
    sourceDefinitionCardId: source.definitionCardId,
    sourceKind: source.kind,
  });

  if (!profile) {
    return {
      ok: false,
      state,
      reason: "Entity active profile was not found for source entity.",
    };
  }

  if (source.remainingMoves < profile.moveCost) {
    return {
      ok: false,
      state,
      reason: "Source entity does not have enough moves to use active ability.",
    };
  }

  const { minimum, maximum } = computeScaledDamageRange({
    minimum: profile.minimumDamage,
    maximum: profile.maximumDamage,
    attackDamage: source.attackDamage,
    abilityPower: source.abilityPower,
    attackDamageScaling: profile.attackDamageScaling,
    abilityPowerScaling: profile.abilityPowerScaling,
  });

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  const wasCritical = battleRng.nextFloat() < source.criticalChance;
  const criticalMultiplier = wasCritical ? source.criticalMultiplier : 1;
  const finalRoll = adjustedRoll * criticalMultiplier;

  let wasDodged = false;
  let dodgeRoll = 0;
  if (profile.canBeDodged) {
    dodgeRoll = battleRng.nextFloat();
    wasDodged = dodgeRoll < target.dodgeChance;
  }

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      profile.damageType === "physical"
        ? target.armor
        : profile.damageType === "magic"
          ? target.magicResist
          : 0;
    appliedDamage = toAppliedDamage(finalRoll, resistance);
  }

  const targetHealth = roundWhole(target.currentHealth);

  let sequence = nextSequence;
  const events: BattleEvent[] = [];

  const nextState: BattleState = {
    ...state,
    entitiesById: {
      ...state.entitiesById,
      [source.entityId]: {
        ...source,
        remainingMoves: source.remainingMoves - profile.moveCost,
      },
      [target.entityId]: {
        ...target,
        currentHealth: Math.max(0, targetHealth - appliedDamage),
      },
    },
  };

  events.push({
    kind: "damageApplied",
    sequence,
    sourceEntityId: source.entityId,
    targetEntityId: target.entityId,
    amount: appliedDamage,
    damageType: profile.damageType,
    wasDodged,
    wasCritical,
    rngRawRoll: rawRoll,
    rngAdjustedRoll: adjustedRoll,
    rngFinalRoll: finalRoll,
    rngDodgeRoll: profile.canBeDodged ? dodgeRoll : undefined,
  });
  sequence += 1;

  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence,
    resultMessage: wasDodged
      ? `Entity active missed (dodge). RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)} (crit)` : ""}; dodge roll ${dodgeRoll.toFixed(2)}.`
      : `Entity active dealt ${appliedDamage} ${profile.damageType} damage${wasCritical ? " (crit!)" : ""}. RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)}` : ""}.`,
  };
}

import {
  type BattleEvent,
  type BattleState,
  type DamageType,
  type UseEntityActiveAction,
} from "../../shared/models";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";

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

  const actorHero = state.entitiesById[action.actorHeroEntityId];
  if (!actorHero || actorHero.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Acting hero was not found.",
    };
  }

  if (state.turn.activeHeroEntityId !== actorHero.entityId) {
    return {
      ok: false,
      state,
      reason: "Only the active hero can use an entity active.",
    };
  }

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

  const minimum =
    profile.minimumDamage +
    source.attackDamage * profile.attackDamageScaling +
    source.abilityPower * profile.abilityPowerScaling;
  const maximum =
    profile.maximumDamage +
    source.attackDamage * profile.attackDamageScaling +
    source.abilityPower * profile.abilityPowerScaling;

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  let wasDodged = false;
  if (profile.canBeDodged) {
    wasDodged = battleRng.nextFloat() < target.dodgeChance;
  }

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      profile.damageType === "physical"
        ? target.armor
        : profile.damageType === "magic"
          ? target.magicResist
          : 0;
    appliedDamage = toAppliedDamage(adjustedRoll, resistance);
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
  };
}

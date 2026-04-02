import {
  type BasicAttackAction,
  type BattleEvent,
  type BattleState,
  type HeroDefinition,
} from "../../shared/models";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";

export type ResolveBasicAttackResult =
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

export function resolveBasicAttackAction(options: {
  state: BattleState;
  action: BasicAttackAction;
  nextSequence: number;
  battleRng: BattleRng;
  heroDefinitionsById: Record<string, HeroDefinition>;
}): ResolveBasicAttackResult {
  const { state, action, nextSequence, battleRng, heroDefinitionsById } = options;

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
      reason: "Only the active hero can perform a basic attack.",
    };
  }

  const attacker = state.entitiesById[action.attackerEntityId];
  if (!attacker || attacker.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Basic attack currently supports hero attackers only.",
    };
  }

  if (attacker.entityId !== actorHero.entityId) {
    return {
      ok: false,
      state,
      reason: "Basic attack attacker must be the acting hero.",
    };
  }

  const target = state.entitiesById[action.selection.targetEntityId];
  if (!target) {
    return {
      ok: false,
      state,
      reason: "Basic attack target was not found.",
    };
  }

  if (target.battlefieldSide === attacker.battlefieldSide) {
    return {
      ok: false,
      state,
      reason: "Basic attack target must be on the opposing side.",
    };
  }

  const heroDefinition = heroDefinitionsById[attacker.heroDefinitionId];
  if (!heroDefinition) {
    return {
      ok: false,
      state,
      reason: "Hero definition was not found for basic attack attacker.",
    };
  }

  const attack = heroDefinition.basicAttack;
  if (attacker.movePoints < attacker.basicAttackMoveCost) {
    return {
      ok: false,
      state,
      reason: "Not enough move points to perform a basic attack.",
    };
  }

  const minimum =
    attack.minimumDamage +
    attacker.attackDamage * attack.attackDamageScaling +
    attacker.abilityPower * attack.abilityPowerScaling;
  const maximum =
    attack.maximumDamage +
    attacker.attackDamage * attack.attackDamageScaling +
    attacker.abilityPower * attack.abilityPowerScaling;

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: attacker.entityId,
  });

  const wasDodged = battleRng.nextFloat() < target.dodgeChance;

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      attack.damageType === "physical"
        ? target.armor
        : attack.damageType === "magic"
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
      [attacker.entityId]: {
        ...attacker,
        movePoints: attacker.movePoints - attacker.basicAttackMoveCost,
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
    sourceEntityId: attacker.entityId,
    targetEntityId: target.entityId,
    amount: appliedDamage,
    damageType: attack.damageType,
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

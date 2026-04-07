import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const JAQUEMIN_PATROL_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "companion",
  definitionCardId: "card.commander-x.jaquemin-patrol",
  maxHealth: 15,
  armor: 1,
  magicResist: 0,
  attackDamage: 2,
  abilityPower: 0,
  criticalChance: 0.1,
  criticalMultiplier: 1.5,
  dodgeChance: 0.1,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const JAQUEMIN_PATROL_ACTIVE: EntityActiveProfile = {
  moveCost: 1,
  minimumDamage: 2,
  maximumDamage: 4,
  damageType: "physical",
  attackDamageScaling: 0.50,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const JAQUEMIN_PATROL_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.jaqueminPatrol,
  blueprint: JAQUEMIN_PATROL_BLUEPRINT,
  active: JAQUEMIN_PATROL_ACTIVE,
  footprint: JAQUEMIN_PATROL_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

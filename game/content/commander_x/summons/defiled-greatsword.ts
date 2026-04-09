import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const DEFILED_GREATSWORD_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "weapon",
  definitionCardId: "card.commander-x.defiled-greatsword",
  maxHealth: 25,
  armor: 1,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const DEFILED_GREATSWORD_ACTIVE: EntityActiveProfile = {
  moveCost: 1,
  minimumDamage: 4,
  maximumDamage: 9,
  damageType: "physical",
  attackDamageScaling: 1,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const DEFILED_GREATSWORD_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.defiledGreatsword,
  blueprint: DEFILED_GREATSWORD_BLUEPRINT,
  active: DEFILED_GREATSWORD_ACTIVE,
  footprint: DEFILED_GREATSWORD_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

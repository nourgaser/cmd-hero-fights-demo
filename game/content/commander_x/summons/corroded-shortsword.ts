import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const CORRODED_SHORTSWORD_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "weapon",
  definitionCardId: "card.commander-x.corroded-shortsword",
  maxHealth: 14,
  armor: 0,
  magicResist: 0,
  attackDamage: 2,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const CORRODED_SHORTSWORD_ACTIVE: EntityActiveProfile = {
  moveCost: 1,
  minimumDamage: 2,
  maximumDamage: 6,
  damageType: "physical",
  attackDamageScaling: 0.5,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const CORRODED_SHORTSWORD_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.corrodedShortsword,
  blueprint: CORRODED_SHORTSWORD_BLUEPRINT,
  active: CORRODED_SHORTSWORD_ACTIVE,
  footprint: CORRODED_SHORTSWORD_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

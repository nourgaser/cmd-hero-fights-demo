import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const GLINTING_ADAMANTITE_BLADE_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "weapon",
  definitionCardId: "card.commander-x.glinting-adamantite-blade",
  maxHealth: 20,
  armor: 0,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const GLINTING_ADAMANTITE_BLADE_ACTIVE: EntityActiveProfile = {
  kind: "attack",
  moveCost: 1,
  minimumDamage: 0,
  maximumDamage: 0,
  damageType: "physical",
  attackDamageScaling: 0.5,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const GLINTING_ADAMANTITE_BLADE_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.glintingAdamantiteBlade,
  blueprint: GLINTING_ADAMANTITE_BLADE_BLUEPRINT,
  active: GLINTING_ADAMANTITE_BLADE_ACTIVE,
  footprint: GLINTING_ADAMANTITE_BLADE_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

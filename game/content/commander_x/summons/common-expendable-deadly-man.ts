import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { KEYWORD_IDS } from "../../keywords";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const COMMON_EXPENDABLE_DEADLY_MAN_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "companion",
  definitionCardId: "card.commander-x.common-expendable-deadly-man",
  keywordIds: [KEYWORD_IDS.chivalry],
  maxHealth: 10,
  armor: 1,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0.25,
  criticalMultiplier: 1.5,
  dodgeChance: 0.1,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
};

export const COMMON_EXPENDABLE_DEADLY_MAN_ACTIVE: EntityActiveProfile = {
  moveCost: 1,
  minimumDamage: 1,
  maximumDamage: 3,
  damageType: "physical",
  attackDamageScaling: 0.5,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const COMMON_EXPENDABLE_DEADLY_MAN_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.commonExpendableDeadlyMan,
  blueprint: COMMON_EXPENDABLE_DEADLY_MAN_BLUEPRINT,
  active: COMMON_EXPENDABLE_DEADLY_MAN_ACTIVE,
  footprint: COMMON_EXPENDABLE_DEADLY_MAN_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

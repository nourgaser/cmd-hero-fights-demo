import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const WAR_STANDARD_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "totem",
  definitionCardId: "card.commander-x.war-standard",
  maxHealth: 10,
  armor: 0,
  magicResist: 0,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 0,
  remainingMoves: 0,
};

export const WAR_STANDARD_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.warStandard,
  blueprint: WAR_STANDARD_BLUEPRINT,
  footprint: WAR_STANDARD_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

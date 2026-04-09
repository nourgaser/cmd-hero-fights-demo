import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";
import type { CommanderXSummonedDefinition } from "./types";

export const HEALING_FORTRESS_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "totem",
  definitionCardId: "card.commander-x.healing-fortress",
  keywordIds: [KEYWORD_IDS.taunt],
  maxHealth: 5,
  armor: 10,
  magicResist: 7,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 0,
  remainingMoves: 0,
};

export const HEALING_FORTRESS_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.healingFortress,
  blueprint: HEALING_FORTRESS_BLUEPRINT,
  footprint: HEALING_FORTRESS_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

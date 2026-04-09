import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityFootprint } from "../../../shared/models";
import { KEYWORD_IDS } from "../../keywords";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const BULWARK_OF_FORTUNE_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "totem",
  definitionCardId: "card.commander-x.bulwark-of-fortune",
  keywordIds: [KEYWORD_IDS.taunt],
  maxHealth: 10,
  armor: 0,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  maxMovesPerTurn: 0,
  remainingMoves: 0,
};

export const BULWARK_OF_FORTUNE_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.bulwarkOfFortune,
  blueprint: BULWARK_OF_FORTUNE_BLUEPRINT,
  footprint: BULWARK_OF_FORTUNE_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

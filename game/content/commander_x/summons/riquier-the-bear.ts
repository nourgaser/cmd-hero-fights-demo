import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { KEYWORD_IDS } from "../../keywords";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const RIQUIER_THE_BEAR_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "companion",
  definitionCardId: "card.commander-x.riquier-the-bear",
  keywordIds: [KEYWORD_IDS.chivalry, KEYWORD_IDS.vengeful],
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

export const RIQUIER_THE_BEAR_ACTIVE: EntityActiveProfile = {
  kind: "attack",
  moveCost: 1,
  minimumDamage: 1,
  maximumDamage: 7,
  damageType: "physical",
  attackDamageScaling: 0.5,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const RIQUIER_THE_BEAR_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.riquierTheBear,
  blueprint: RIQUIER_THE_BEAR_BLUEPRINT,
  active: RIQUIER_THE_BEAR_ACTIVE,
  footprint: RIQUIER_THE_BEAR_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;
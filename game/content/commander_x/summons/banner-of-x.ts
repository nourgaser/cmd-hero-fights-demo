import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import type { CommanderXSummonedDefinition } from "./types";

export const BANNER_OF_X_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "totem",
  definitionCardId: "card.commander-x.banner-of-x",
  maxHealth: 9,
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

export const BANNER_OF_X_FOOTPRINT: EntityFootprint = [{ row: 0, column: 0 }];

export default {
  entityId: SUMMON_ENTITY_IDS.bannerOfX,
  blueprint: BANNER_OF_X_BLUEPRINT,
  footprint: BANNER_OF_X_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;
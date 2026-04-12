import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../../../shared/models";
import { SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";
import type { CommanderXSummonedDefinition } from "./types";

const SHAMANIC_TITANIUM_PUMMELER_HEAVY_INTERVAL = 2;
const SHAMANIC_TITANIUM_PUMMELER_SHARPNESS = 2;

export const SHAMANIC_TITANIUM_PUMMELER_BLUEPRINT: SummonedEntityBlueprint = {
  kind: "weapon",
  definitionCardId: "card.commander-x.shamanic-titanium-pummeler",
  keywordIds: [KEYWORD_IDS.heavy, KEYWORD_IDS.sharpness],
  maxHealth: 20,
  armor: 1,
  magicResist: 1,
  attackDamage: 0,
  abilityPower: 0,
  criticalChance: 0,
  criticalMultiplier: 1,
  dodgeChance: 0,
  baseSharpness: SHAMANIC_TITANIUM_PUMMELER_SHARPNESS,
  maxMovesPerTurn: 1,
  remainingMoves: 1,
  moveRefreshIntervalTurns: SHAMANIC_TITANIUM_PUMMELER_HEAVY_INTERVAL,
};

export const SHAMANIC_TITANIUM_PUMMELER_ACTIVE: EntityActiveProfile = {
  kind: "attack",
  moveCost: 1,
  minimumDamage: 7,
  maximumDamage: 18,
  damageType: "physical",
  attackDamageScaling: 1,
  abilityPowerScaling: 0,
  canBeDodged: true,
};

export const SHAMANIC_TITANIUM_PUMMELER_FOOTPRINT: EntityFootprint = [
  { row: 0, column: 0 },
];

export default {
  entityId: SUMMON_ENTITY_IDS.shamanicTitaniumPummeler,
  blueprint: SHAMANIC_TITANIUM_PUMMELER_BLUEPRINT,
  active: SHAMANIC_TITANIUM_PUMMELER_ACTIVE,
  footprint: SHAMANIC_TITANIUM_PUMMELER_FOOTPRINT,
} satisfies CommanderXSummonedDefinition;

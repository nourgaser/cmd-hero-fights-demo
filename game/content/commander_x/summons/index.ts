import type { EntityFootprint } from "../../../shared/models";
import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import {
  type CommanderXSummonedEntityId,
  isCommanderXSummonedEntityId,
} from "../constants";
import type { CommanderXSummonedDefinition } from "./types";
import bannerOfXDef from "./banner-of-x";
import bulwarkOfFortuneDef from "./bulwark-of-fortune";
import commonExpendableDeadlyManDef from "./common-expendable-deadly-man";
import corrodedShortswordDef from "./corroded-shortsword";
import defiledGreatswordDef from "./defiled-greatsword";
import evergrowthIdolDef from "./evergrowth-idol";
import glintingAdamantiteBladeDef from "./glinting-adamantite-blade";
import healingFortressDef from "./healing-fortress";
import warStandardDef from "./war-standard";
import guardSigilDef from "./guard-sigil";
import steelboundEffigyDef from "./steelbound-effigy";
import merewenTheShieldmaidenDef from "./merewen-the-shieldmaiden";
import jaqueminPatrolDef from "./jaquemin-patrol";
import shamanicTitaniumPummelerDef from "./shamanic-titanium-pummeler";

const COMMANDER_X_SUMMONED_DEFINITIONS = [
  bannerOfXDef,
  corrodedShortswordDef,
  defiledGreatswordDef,
  glintingAdamantiteBladeDef,
  shamanicTitaniumPummelerDef,
  warStandardDef,
  guardSigilDef,
  healingFortressDef,
  evergrowthIdolDef,
  steelboundEffigyDef,
  bulwarkOfFortuneDef,
  jaqueminPatrolDef,
  commonExpendableDeadlyManDef,
  merewenTheShieldmaidenDef,
] as const satisfies readonly CommanderXSummonedDefinition[];

const COMMANDER_X_SUMMONED_BLUEPRINT_ENTRIES = COMMANDER_X_SUMMONED_DEFINITIONS.map((definition) => [
  definition.entityId,
  definition.blueprint,
] as const);

const COMMANDER_X_SUMMON_FOOTPRINT_ENTRIES = COMMANDER_X_SUMMONED_DEFINITIONS.map((definition) => [
  definition.entityId,
  definition.footprint,
] as const);

const COMMANDER_X_ENTITY_ACTIVE_PROFILE_ENTRIES = COMMANDER_X_SUMMONED_DEFINITIONS
  .filter((definition) => "active" in definition && definition.active !== undefined)
  .map((definition) => [
    definition.blueprint.definitionCardId,
    (definition as CommanderXSummonedDefinition & { active: EntityActiveProfile }).active,
  ] as const);

export const COMMANDER_X_SUMMONED_BLUEPRINTS = Object.fromEntries(
  COMMANDER_X_SUMMONED_BLUEPRINT_ENTRIES,
) as Readonly<Record<CommanderXSummonedEntityId, SummonedEntityBlueprint>>;

export const COMMANDER_X_ENTITY_ACTIVE_PROFILES = Object.fromEntries(
  COMMANDER_X_ENTITY_ACTIVE_PROFILE_ENTRIES,
) as Readonly<Partial<Record<string, EntityActiveProfile>>>;

export const COMMANDER_X_SUMMON_FOOTPRINTS = Object.fromEntries(
  COMMANDER_X_SUMMON_FOOTPRINT_ENTRIES,
) as Readonly<Record<CommanderXSummonedEntityId, EntityFootprint>>;

export function resolveCommanderXSummonedBlueprint(
  entityDefinitionId: string,
): SummonedEntityBlueprint | undefined {
  if (!isCommanderXSummonedEntityId(entityDefinitionId)) {
    return undefined;
  }

  return COMMANDER_X_SUMMONED_BLUEPRINTS[entityDefinitionId];
}

export function resolveCommanderXSummonFootprint(
  entityDefinitionId: string,
): EntityFootprint | undefined {
  if (!isCommanderXSummonedEntityId(entityDefinitionId)) {
    return undefined;
  }

  return COMMANDER_X_SUMMON_FOOTPRINTS[entityDefinitionId];
}

export function resolveCommanderXEntityActiveProfile(
  sourceDefinitionCardId: string,
): EntityActiveProfile | undefined {
  return COMMANDER_X_ENTITY_ACTIVE_PROFILES[sourceDefinitionCardId];
}

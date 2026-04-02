import type { EntityFootprint } from "../../../shared/models";
import type { SummonedEntityBlueprint } from "../../../engine/actions/effects/context";
import type { EntityActiveProfile } from "../../../engine/actions/resolve-use-entity-active";
import { SUMMON_ENTITY_IDS } from "../constants";
import corrodedShortswordDef from "./corroded-shortsword";
import warStandardDef from "./war-standard";
import guardSigilDef from "./guard-sigil";
import jaqueminPatrolDef from "./jaquemin-patrol";

export const COMMANDER_X_SUMMONED_BLUEPRINTS: Record<string, SummonedEntityBlueprint> = {
  [SUMMON_ENTITY_IDS.corrodedShortsword]: corrodedShortswordDef.blueprint,
  [SUMMON_ENTITY_IDS.warStandard]: warStandardDef.blueprint,
  [SUMMON_ENTITY_IDS.guardSigil]: guardSigilDef.blueprint,
  [SUMMON_ENTITY_IDS.jaqueminPatrol]: jaqueminPatrolDef.blueprint,
};

export const COMMANDER_X_ENTITY_ACTIVE_PROFILES: Record<string, EntityActiveProfile> = {
  [corrodedShortswordDef.blueprint.definitionCardId]: corrodedShortswordDef.active!,
  [jaqueminPatrolDef.blueprint.definitionCardId]: jaqueminPatrolDef.active!,
};

export const COMMANDER_X_SUMMON_FOOTPRINTS: Record<string, EntityFootprint> = {
  [SUMMON_ENTITY_IDS.corrodedShortsword]: corrodedShortswordDef.footprint,
  [SUMMON_ENTITY_IDS.warStandard]: warStandardDef.footprint,
  [SUMMON_ENTITY_IDS.guardSigil]: guardSigilDef.footprint,
  [SUMMON_ENTITY_IDS.jaqueminPatrol]: jaqueminPatrolDef.footprint,
};

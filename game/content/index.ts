import {
  COMMANDER_X_CARDS,
  COMMANDER_X_ENTITY_ACTIVE_PROFILES,
  COMMANDER_X_HERO,
  COMMANDER_X_HERO_ID,
  COMMANDER_X_SUMMONED_BLUEPRINTS,
  COMMANDER_X_SUMMON_FOOTPRINTS,
  createCommanderXInitialListeners,
} from "./commander_x";
import type { ListenerDefinition } from "../shared/models";

export const HERO_DEFINITIONS_BY_ID = {
  [COMMANDER_X_HERO_ID]: COMMANDER_X_HERO,
};

export const CARD_DEFINITIONS_BY_ID = Object.fromEntries(
  COMMANDER_X_CARDS.map((card) => [card.id, card]),
);

export function resolveSummonedEntityBlueprint(
  entityDefinitionId: string,
  _kind: "weapon" | "totem" | "companion",
) {
  return COMMANDER_X_SUMMONED_BLUEPRINTS[entityDefinitionId];
}

export function resolveEntityActiveProfile(options: {
  sourceDefinitionCardId: string;
  sourceKind: "weapon" | "companion";
}) {
  return COMMANDER_X_ENTITY_ACTIVE_PROFILES[options.sourceDefinitionCardId];
}

export function resolveSummonFootprint(entityDefinitionId: string) {
  return COMMANDER_X_SUMMON_FOOTPRINTS[entityDefinitionId];
}

export function resolveHeroInitialListeners(options: {
  heroDefinitionId: string;
  heroEntityId: string;
}): ListenerDefinition[] {
  if (options.heroDefinitionId === COMMANDER_X_HERO_ID) {
    return createCommanderXInitialListeners(options.heroEntityId);
  }

  return [];
}

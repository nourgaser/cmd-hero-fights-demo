import {
  COMMANDER_X_CARDS,
  COMMANDER_X_HERO,
  COMMANDER_X_HERO_ID,
  createCommanderXInitialListeners,
  resolveCommanderXEntityActiveProfile,
  resolveCommanderXSummonedBlueprint,
  resolveCommanderXSummonFootprint,
} from "./commander_x";
import { KEYWORD_DEFINITIONS_BY_ID } from "./keywords";
import type {
  CardDefinition,
  HeroDefinition,
} from "../shared/models";
import type { ContentRegistry } from "../engine/core/content-registry";

export const HERO_DEFINITIONS_BY_ID = {
  [COMMANDER_X_HERO_ID]: COMMANDER_X_HERO,
} as const satisfies Readonly<Record<string, HeroDefinition>>;

export const CARD_DEFINITIONS_BY_ID = Object.fromEntries(
  COMMANDER_X_CARDS.map((card) => [card.id, card] as const),
) as Readonly<Record<string, CardDefinition>>;

export const GAME_CONTENT_REGISTRY: ContentRegistry = {
  heroesById: HERO_DEFINITIONS_BY_ID,
  cardsById: CARD_DEFINITIONS_BY_ID,
  keywordsById: KEYWORD_DEFINITIONS_BY_ID,

  resolveSummonedEntityBlueprint(entityDefinitionId) {
    return resolveCommanderXSummonedBlueprint(entityDefinitionId);
  },

  resolveEntityActiveProfile(options) {
    return resolveCommanderXEntityActiveProfile(options.sourceDefinitionCardId);
  },

  resolveSummonFootprint(entityDefinitionId) {
    return resolveCommanderXSummonFootprint(entityDefinitionId);
  },

  resolveHeroInitialListeners(options) {
    if (options.heroDefinitionId === COMMANDER_X_HERO_ID) {
      return createCommanderXInitialListeners(options.heroEntityId);
    }
    return [];
  },
};

export { KEYWORD_DEFINITIONS_BY_ID };

import {
  COMMANDER_X_CARDS,
  type CommanderXCardDefinition,
  type CommanderXCardId,
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
  ListenerDefinition,
} from "../shared/models";
import type { SummonedEntityBlueprint } from "../engine/actions/effects/context";
import type { EntityActiveProfile } from "../engine/actions/resolve-use-entity-active";
import type { EntityFootprint } from "../shared/models";

export const HERO_DEFINITIONS_BY_ID = {
  [COMMANDER_X_HERO_ID]: COMMANDER_X_HERO,
} as const satisfies Readonly<Record<string, HeroDefinition>>;

const COMMANDER_X_CARD_DEFINITIONS_BY_ID = Object.fromEntries(
  COMMANDER_X_CARDS.map((card) => [card.id, card] as const),
) as Readonly<Record<CommanderXCardId, CommanderXCardDefinition>>;

export const CARD_DEFINITIONS_BY_ID =
  COMMANDER_X_CARD_DEFINITIONS_BY_ID satisfies Readonly<Record<string, CardDefinition>>;

export { KEYWORD_DEFINITIONS_BY_ID };

export function resolveSummonedEntityBlueprint(
  entityDefinitionId: string,
  _kind: "weapon" | "totem" | "companion",
): SummonedEntityBlueprint | undefined {
  return resolveCommanderXSummonedBlueprint(entityDefinitionId);
}

export function resolveEntityActiveProfile(options: {
  sourceDefinitionCardId: string;
  sourceKind: "weapon" | "companion";
}): EntityActiveProfile | undefined {
  return resolveCommanderXEntityActiveProfile(options.sourceDefinitionCardId);
}

export function resolveSummonFootprint(entityDefinitionId: string): EntityFootprint | undefined {
  return resolveCommanderXSummonFootprint(entityDefinitionId);
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

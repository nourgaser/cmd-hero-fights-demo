import type {
  CardDefinition,
  HeroDefinition,
  KeywordDefinition,
  ListenerDefinition,
  EntityFootprint,
} from "../../shared/models";
import type { SummonedEntityBlueprint } from "../actions/effects/context";
import type { EntityActiveProfile } from "../actions/resolve-use-entity-active";

export interface ContentRegistry {
  readonly heroesById: Readonly<Record<string, HeroDefinition>>;
  readonly cardsById: Readonly<Record<string, CardDefinition>>;
  readonly keywordsById: Readonly<Record<string, KeywordDefinition>>;

  resolveSummonedEntityBlueprint(
    entityDefinitionId: string,
    kind: "weapon" | "totem" | "companion",
  ): SummonedEntityBlueprint | undefined;

  resolveEntityActiveProfile(options: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }): EntityActiveProfile | undefined;

  resolveSummonFootprint(entityDefinitionId: string): EntityFootprint | undefined;

  resolveHeroInitialListeners(options: {
    heroDefinitionId: string;
    heroEntityId: string;
  }): ListenerDefinition[];
}

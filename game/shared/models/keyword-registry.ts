import { z } from "zod";

import { KeywordSchema, type Keyword } from "./keyword";

/**
 * KeywordRegistry is the runtime contract for keyword lookup and metadata.
 * 
 * During Phase 1, keywords are hand-authored and static.
 * The registry provides a simple interface for the engine and UI to:
 * - lookup keyword by id
 * - get all keywords
 * - validate keyword references
 * 
 * Future: this could be generated from reference content or loaded from data files.
 */
export const KeywordRegistrySchema = z.object({
  byId: z.record(z.string().min(1), KeywordSchema),
});

export type KeywordRegistry = z.infer<typeof KeywordRegistrySchema>;

/**
 * Helper to create a keyword registry from a list of keywords.
 */
export function createKeywordRegistry(keywords: Keyword[]): KeywordRegistry {
  return {
    byId: Object.fromEntries(keywords.map((k) => [k.id, k])),
  };
}

/**
 * Helper to lookup keyword by ID.
 */
export function lookupKeyword(
  registry: KeywordRegistry,
  keywordId: string,
): Keyword | undefined {
  return registry.byId[keywordId];
}

/**
 * Helper to validate that a keyword exists in the registry.
 */
export function isKeywordDefined(
  registry: KeywordRegistry,
  keywordId: string,
): boolean {
  return keywordId in registry.byId;
}

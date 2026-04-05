import { z } from "zod";

/**
 * Keyword identifiers are branded strings for type safety.
 * Format: "keyword.{name_in_snake_case}" e.g., "keyword.chivalry", "keyword.aura"
 */
export const KeywordIdSchema = z.string().min(1).regex(/^keyword\./);
export type KeywordId = z.infer<typeof KeywordIdSchema>;

/**
 * Keyword represents a reusable game mechanic that cards can reference.
 * Keywords allow UI to display canonical descriptions and engines to reuse effect patterns.
 * 
 * Examples:
 * - Aura: "An effect that lasts for 5 turns."
 * - Chivalry: "Adjacency buffs from allied Chivalry units are doubled."
 * - Deathrattle: "Triggered when this entity is removed from the battlefield."
 */
export const KeywordSchema = z.object({
  id: KeywordIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  iconId: z.string().min(1).optional(),
  behaviorTags: z.array(z.string().min(1)).default([]),
});

export type Keyword = z.infer<typeof KeywordSchema>;

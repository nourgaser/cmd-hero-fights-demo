import { z } from "zod";

import {
  EffectDisplayTextSchema,
  type EffectTextParamValue,
  EffectTextParamValueSchema,
  renderEffectDisplayText,
} from "./effects/display-text";

export const KeywordIdSchema = z.string().min(1);
export type KeywordId = z.infer<typeof KeywordIdSchema>;

export const KeywordReferenceSchema = z.object({
  keywordId: KeywordIdSchema,
  params: z
    .record(z.string().min(1), z.union([EffectTextParamValueSchema, z.undefined()]))
    .optional(),
});
export type KeywordReference = z.infer<typeof KeywordReferenceSchema>;

export const KeywordDefinitionSchema = z.object({
  id: KeywordIdSchema,
  name: z.string().min(1),
  summaryText: EffectDisplayTextSchema,
});
export type KeywordDefinition = z.infer<typeof KeywordDefinitionSchema>;

export function renderKeywordSummaryText(options: {
  definition: Pick<KeywordDefinition, "summaryText">;
  params?: KeywordReference["params"];
}): string {
  return renderEffectDisplayText({
    template: options.definition.summaryText.template,
    params: {
      ...(options.definition.summaryText.params ?? {}),
      ...(options.params ?? {}),
    } satisfies Record<string, EffectTextParamValue | undefined>,
  });
}
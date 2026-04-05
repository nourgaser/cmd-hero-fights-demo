import { z } from "zod";

export const EffectTextParamValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);
export type EffectTextParamValue = z.infer<typeof EffectTextParamValueSchema>;

export const EffectDisplayTextSchema = z.object({
  template: z.string().min(1),
  params: z
    .record(z.string().min(1), z.union([EffectTextParamValueSchema, z.undefined()]))
    .optional(),
});
export type EffectDisplayText = z.infer<typeof EffectDisplayTextSchema>;

export function renderEffectDisplayText(displayText: EffectDisplayText): string {
  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params?.[key];
    return value === undefined ? match : String(value);
  });
}

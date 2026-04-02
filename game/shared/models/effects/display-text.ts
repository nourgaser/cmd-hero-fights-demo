import { z } from "zod";

export const EffectTextParamValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);
export type EffectTextParamValue = z.infer<typeof EffectTextParamValueSchema>;

export const EffectStaticTextSchema = z.object({
  mode: z.literal("static"),
  text: z.string().min(1),
});
export type EffectStaticText = z.infer<typeof EffectStaticTextSchema>;

export const EffectDynamicTextSchema = z.object({
  mode: z.literal("template"),
  template: z.string().min(1),
  params: z.record(z.string().min(1), EffectTextParamValueSchema),
});
export type EffectDynamicText = z.infer<typeof EffectDynamicTextSchema>;

export const EffectDisplayTextSchema = z.discriminatedUnion("mode", [
  EffectStaticTextSchema,
  EffectDynamicTextSchema,
]);
export type EffectDisplayText = z.infer<typeof EffectDisplayTextSchema>;

export function renderEffectDisplayText(displayText: EffectDisplayText): string {
  if (displayText.mode === "static") {
    return displayText.text;
  }

  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params[key];
    return value === undefined ? match : String(value);
  });
}

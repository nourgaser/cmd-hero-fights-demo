export function buildModifierId(options: {
  effectId: string;
  sequence: number;
  targetEntityId: string;
}): string {
  return `mod.${options.effectId}.${options.targetEntityId}.${options.sequence}`;
}

export function buildPassiveRuleId(options: {
  effectId: string;
  sequence: number;
  sourceEntityId: string;
}): string {
  return `rule.${options.effectId}.${options.sourceEntityId}.${options.sequence}`;
}

export function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function sourceLabelFromEffectId(effectId: string): string {
  const segments = effectId.split(".");
  if (segments[0] === "effect" && segments[1]) {
    return titleCaseFromSlug(segments[1]);
  }
  return effectId;
}

export const COMMANDER_X_HERO_ID = "hero.commander-x";

export const SUMMON_ENTITY_IDS = {
  corrodedShortsword: "entity.weapon.corroded-shortsword",
  defiledGreatsword: "entity.weapon.defiled-greatsword",
  glintingAdamantiteBlade: "entity.weapon.glinting-adamantite-blade",
  shamanicTitaniumPummeler: "entity.weapon.shamanic-titanium-pummeler",
  warStandard: "entity.totem.war-standard",
  guardSigil: "entity.totem.guard-sigil",
  jaqueminPatrol: "entity.companion.jaquemin-patrol",
} as const;

export type CommanderXSummonedEntityId =
  (typeof SUMMON_ENTITY_IDS)[keyof typeof SUMMON_ENTITY_IDS];

const COMMANDER_X_SUMMONED_ENTITY_IDS: ReadonlySet<string> = new Set(
  Object.values(SUMMON_ENTITY_IDS),
);

export function isCommanderXSummonedEntityId(value: string): value is CommanderXSummonedEntityId {
  return COMMANDER_X_SUMMONED_ENTITY_IDS.has(value);
}

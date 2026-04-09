export const COMMANDER_X_HERO_ID = "hero.commander-x";

export const SUMMON_ENTITY_IDS = {
  bannerOfX: "entity.totem.banner-of-x",
  corrodedShortsword: "entity.weapon.corroded-shortsword",
  defiledGreatsword: "entity.weapon.defiled-greatsword",
  evergrowthIdol: "entity.totem.evergrowth-idol",
  glintingAdamantiteBlade: "entity.weapon.glinting-adamantite-blade",
  healingFortress: "entity.totem.healing-fortress",
  shamanicTitaniumPummeler: "entity.weapon.shamanic-titanium-pummeler",
  warStandard: "entity.totem.war-standard",
  guardSigil: "entity.totem.guard-sigil",
  steelboundEffigy: "entity.totem.steelbound-effigy",
  bulwarkOfFortune: "entity.totem.bulwark-of-fortune",
  jaqueminPatrol: "entity.companion.jaquemin-patrol",
  commonExpendableDeadlyMan: "entity.companion.common-expendable-deadly-man",
} as const;

export type CommanderXSummonedEntityId =
  (typeof SUMMON_ENTITY_IDS)[keyof typeof SUMMON_ENTITY_IDS];

const COMMANDER_X_SUMMONED_ENTITY_IDS: ReadonlySet<string> = new Set(
  Object.values(SUMMON_ENTITY_IDS),
);

export function isCommanderXSummonedEntityId(value: string): value is CommanderXSummonedEntityId {
  return COMMANDER_X_SUMMONED_ENTITY_IDS.has(value);
}

import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const GLINTING_ADAMANTITE_BLADE_CARD = {
  id: "card.commander-x.glinting-adamantite-blade",
  name: "Glinting Adamantite Blade",
  type: "weapon",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 9,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Summon Glinting Adamantite Blade. Passive: This weapon's maximum damage is equal to its current HP.",
  },
  effects: [
    {
      id: "effect.glinting-adamantite-blade.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "weapon",
        entityDefinitionId: SUMMON_ENTITY_IDS.glintingAdamantiteBlade,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon your weapon.",
      },
    },
    {
      id: "effect.glinting-adamantite-blade.max-damage-from-current-health",
      payload: {
        kind: "modifyStat",
        target: "sourceEntity",
        stat: "useEntityActive.maximum",
        amountFromSourceStat: "currentHealth",
        amountFromSourceSelector: "sourceEntity",
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "This weapon's maximum damage equals its current HP.",
      },
    },
  ],
} satisfies StrongCardDefinition;

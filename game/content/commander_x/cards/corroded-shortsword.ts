import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const CORRODED_SHORTSWORD_CARD = {
  id: "card.commander-x.corroded-shortsword",
  name: "Corroded Shortsword",
  type: "weapon",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 5,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Summon Corroded Shortsword.",
  },
  effects: [
    {
      id: "effect.corroded-shortsword.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "weapon",
        entityDefinitionId: SUMMON_ENTITY_IDS.corrodedShortsword,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon your weapon.",
      },
    },
  ],
} satisfies StrongCardDefinition;

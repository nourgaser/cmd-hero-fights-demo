import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const DEFILED_GREATSWORD_CARD = {
  id: "card.commander-x.defiled-greatsword",
  name: "Defiled Greatsword",
  type: "weapon",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 13,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Summon Defiled Greatsword.",
  },
  effects: [
    {
      id: "effect.defiled-greatsword.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "weapon",
        entityDefinitionId: SUMMON_ENTITY_IDS.defiledGreatsword,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon your weapon.",
      },
    },
  ],
} satisfies StrongCardDefinition;

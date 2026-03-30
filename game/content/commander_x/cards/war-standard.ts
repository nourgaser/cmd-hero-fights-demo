import type { CardDefinition } from "../../../shared/models";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const WAR_STANDARD_CARD = {
  id: "card.commander-x.war-standard",
  name: "War Standard",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 2,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    mode: "static",
    text: "Summon War Standard.",
  },
  effects: [
    {
      id: "effect.war-standard.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.warStandard,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        mode: "static",
        text: "Summon War Standard.",
      },
    },
  ],
} satisfies CardDefinition;

import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

export const COMMON_EXPENDABLE_DEADLY_MAN_CARD = {
  id: "card.commander-x.common-expendable-deadly-man",
  name: "A Common, Expendable, but Deadly Man",
  type: "companion",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 3,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.chivalry }],
  tags: ["chivalry"],
  summaryText: {
    template: "Summon A Common, Expendable, but Deadly Man.",
  },
  effects: [
    {
      id: "effect.common-expendable-deadly-man.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "companion",
        entityDefinitionId: SUMMON_ENTITY_IDS.commonExpendableDeadlyMan,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon A Common, Expendable, but Deadly Man.",
      },
    },
  ],
} satisfies StrongCardDefinition;

import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

export const STEELBOUND_EFFIGY_CARD = {
  id: "card.commander-x.steelbound-effigy",
  name: "Steelbound Effigy",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 6,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.taunt }],
  tags: [],
  summaryText: {
    template: "Summon Steelbound Effigy. Taunt. This totem has armor equal to your AD.",
  },
  effects: [
    {
      id: "effect.steelbound-effigy.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.steelboundEffigy,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Steelbound Effigy.",
      },
    },
    {
      id: "effect.steelbound-effigy.armor-equals-ad",
      payload: {
        kind: "modifyStat",
        target: "sourceEntity",
        stat: "armor",
        amountFromSourceStat: "attackDamage",
        amountFromSourceSelector: "sourceOwnerHero",
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Armor equals your Attack Damage.",
      },
    },
  ],
} satisfies StrongCardDefinition;

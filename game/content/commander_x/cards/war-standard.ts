import type { StrongCardDefinition } from "./types";
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
    text: "Summon War Standard. Your hero has +1 AD while it remains.",
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
    {
      id: "effect.war-standard.buff-while-source-present",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackDamage",
        amount: 1,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        mode: "static",
        text: "Gain +1 attack damage while War Standard is present.",
      },
    },
  ],
} satisfies StrongCardDefinition;

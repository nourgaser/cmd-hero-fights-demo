import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

const WAR_STANDARD_ATTACK_BONUS = 2;

export const WAR_STANDARD_CARD = {
  id: "card.commander-x.war-standard",
  name: "War Standard",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 7,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    template: "Summon War Standard. Your hero has +{amount} AD while it remains.",
    params: {
      amount: WAR_STANDARD_ATTACK_BONUS,
    },
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
        template: "Summon War Standard.",
      },
    },
    {
      id: "effect.war-standard.buff-while-source-present",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackDamage",
        amount: WAR_STANDARD_ATTACK_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Gain +{amount} attack damage while War Standard is present.",
        params: {
          amount: WAR_STANDARD_ATTACK_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;

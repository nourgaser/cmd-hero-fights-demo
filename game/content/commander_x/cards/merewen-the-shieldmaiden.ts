import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const MEREWEN_ADJACENT_ATTACK_BONUS = 2;
const MEREWEN_ADJACENT_HEAL_AMOUNT = 4;

export const MEREWEN_THE_SHIELDMAIDEN_CARD = {
  id: "card.commander-x.merewen-the-shieldmaiden",
  name: "Merewen the Shieldmaiden",
  type: "companion",
  rarity: "rare",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 9,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.chivalry }, { keywordId: KEYWORD_IDS.taunt }],
  tags: ["reflect", "chivalry"],
  summaryText: {
    template: "Summon Merewen the Shieldmaiden. Chivalry. Taunt. Adjacent allies have +{amount} AD. Restore {heal} HP to all adjacent allies. Next attack on this is reflected.",
    params: {
      amount: MEREWEN_ADJACENT_ATTACK_BONUS,
      heal: MEREWEN_ADJACENT_HEAL_AMOUNT,
    },
  },
  effects: [
    {
      id: "effect.merewen.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "companion",
        entityDefinitionId: SUMMON_ENTITY_IDS.merewenTheShieldmaiden,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Merewen the Shieldmaiden.",
      },
    },
    {
      id: "effect.merewen.adjacent-allies-gain-ad",
      payload: {
        kind: "modifyStat",
        target: "sourceEntityAdjacentAllies",
        stat: "attackDamage",
        amount: MEREWEN_ADJACENT_ATTACK_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Adjacent allies gain +{amount} attack damage while Merewen remains.",
        params: {
          amount: MEREWEN_ADJACENT_ATTACK_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;

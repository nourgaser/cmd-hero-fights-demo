import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const HEALING_FORTRESS_ATTACK_HEAL_BONUS = 1;

export const HEALING_FORTRESS_CARD = {
  id: "card.commander-x.healing-fortress",
  name: "Healing Fortress",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 8,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.taunt }],
  tags: ["buff"],
  summaryText: {
    template: "Summon Healing Fortress. Taunt. Your attacks heal +{amount} while it remains.",
    params: {
      amount: HEALING_FORTRESS_ATTACK_HEAL_BONUS,
    },
  },
  effects: [
    {
      id: "effect.healing-fortress.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.healingFortress,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Healing Fortress.",
      },
    },
    {
      id: "effect.healing-fortress.attack-heal-bonus",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackHealOnAttack",
        amount: HEALING_FORTRESS_ATTACK_HEAL_BONUS,
        duration: "untilSourceRemoved",
        changeKind: "apply",
        sourceBinding: "lastSummonedEntity",
      },
      displayText: {
        template: "Your attacks restore +{amount} HP while Healing Fortress remains.",
        params: {
          amount: HEALING_FORTRESS_ATTACK_HEAL_BONUS,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;

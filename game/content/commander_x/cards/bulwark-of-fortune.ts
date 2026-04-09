import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const BULWARK_OF_FORTUNE_HEAL_AMOUNT = 5;

export const BULWARK_OF_FORTUNE_CARD = {
  id: "card.commander-x.bulwark-of-fortune",
  name: "Bulwark of Fortune",
  type: "totem",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 6,
  targeting: "none",
  keywords: [{ keywordId: KEYWORD_IDS.taunt }],
  tags: ["buff"],
  summaryText: {
    template: "Summon Bulwark of Fortune. Taunt. When this is attacked, give a random ally +{amount} HP.",
    params: {
      amount: BULWARK_OF_FORTUNE_HEAL_AMOUNT,
    },
  },
  effects: [
    {
      id: "effect.bulwark-of-fortune.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "totem",
        entityDefinitionId: SUMMON_ENTITY_IDS.bulwarkOfFortune,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        template: "Summon Bulwark of Fortune.",
      },
    },
    {
      id: "effect.bulwark-of-fortune.attacked-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.bulwark-of-fortune.on-attacked",
        eventKind: "damageApplied",
        sourceBinding: "lastSummonedEntity",
        conditions: [
          { kind: "damageIsAttack" },
          { kind: "damageTargetIsListenerSource" },
        ],
        lifetime: "persistent",
        effects: [
          {
            id: "effect.bulwark-of-fortune.random-ally-grant-health",
            payload: {
              kind: "grantHealth",
              target: "randomSourceOwnerAlly",
              minimum: BULWARK_OF_FORTUNE_HEAL_AMOUNT,
              maximum: BULWARK_OF_FORTUNE_HEAL_AMOUNT,
            },
            displayText: {
              template: "Give a random ally +{amount} HP.",
              params: {
                amount: BULWARK_OF_FORTUNE_HEAL_AMOUNT,
              },
            },
          },
        ],
      },
      displayText: {
        template: "When Bulwark of Fortune is attacked, a random ally restores +{amount} HP while it remains.",
        params: {
          amount: BULWARK_OF_FORTUNE_HEAL_AMOUNT,
        },
      },
    },
  ],
} satisfies StrongCardDefinition;

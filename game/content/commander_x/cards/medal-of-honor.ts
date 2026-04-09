import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";
import { KEYWORD_IDS } from "../../keywords";

const MEDAL_OF_HONOR_ATTACK_BONUS = 2;

export const MEDAL_OF_HONOR_CARD = {
  id: "card.commander-x.medal-of-honor",
  name: "Medal of Honor",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 6,
  targeting: "selectedAllyCompanion",
  keywords: [{ keywordId: KEYWORD_IDS.immune }],
  tags: ["buff"],
  summaryText: {
    template: "Give an allied companion +{amount} AD. It is Immune until your next turn.",
    params: {
      amount: MEDAL_OF_HONOR_ATTACK_BONUS,
    },
  },
  effects: [
    {
      id: "effect.medal-of-honor.gain-ad",
      payload: {
        kind: "modifyStat",
        target: "selectedAny",
        stat: "attackDamage",
        amount: MEDAL_OF_HONOR_ATTACK_BONUS,
        duration: "persistent",
        changeKind: "apply",
        sourceBinding: "selectedTarget",
      },
      displayText: {
        template: "Give the selected companion +{amount} attack damage.",
        params: {
          amount: MEDAL_OF_HONOR_ATTACK_BONUS,
        },
      },
    },
    {
      id: "effect.medal-of-honor.gain-immune",
      payload: {
        kind: "modifyStat",
        target: "selectedAny",
        stat: "immune",
        amount: 1,
        duration: "persistent",
        changeKind: "apply",
        sourceBinding: "selectedTarget",
      },
      displayText: {
        template: "The selected companion becomes Immune until your next turn.",
      },
    },
    {
      id: "effect.medal-of-honor.cleanup-immune",
      payload: {
        kind: "addListener",
        listenerId: "listener.medal-of-honor.cleanup-immune",
        eventKind: "turnStarted",
        sourceBinding: "selectedTarget",
        conditions: [{ kind: "turnStartedIsListenerOwnerHero" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.medal-of-honor.remove-immune",
            payload: {
              kind: "modifyStat",
              target: "sourceEntity",
              stat: "immune",
              amount: 1,
              duration: "persistent",
              changeKind: "removeMatching",
            },
            displayText: {
              template: "Remove Immune from the selected companion at the start of your next turn.",
            },
          },
        ],
      },
      displayText: {
        template: "The selected companion loses Immune at the start of your next turn.",
      },
    },
  ],
} satisfies StrongCardDefinition;
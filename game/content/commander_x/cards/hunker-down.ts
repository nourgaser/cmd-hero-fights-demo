import type { StrongCardDefinition } from "./types";

const HUNKER_DOWN_MOVE_COST = 3;
const HUNKER_DOWN_DODGE_BONUS = 0.25;

export const HUNKER_DOWN_CARD = {
  id: "card.general.hunker-down",
  name: "Hunker Down",
  type: "ability",
  rarity: "general",
  moveCost: HUNKER_DOWN_MOVE_COST,
  targeting: "none",
  tags: [],
  summaryText: {
    template: "Gain +{percent}% dodge chance until your next turn.",
    params: {
      percent: 25,
    },
  },
  effects: [
    {
      id: "effect.hunker-down.apply",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "dodgeChance",
        amount: HUNKER_DOWN_DODGE_BONUS,
        duration: "persistent",
        changeKind: "apply",
      },
      displayText: {
        template: "Gain +{percent}% dodge chance.",
        params: {
          percent: 25,
        },
      },
    },
    {
      id: "effect.hunker-down.expire-listener",
      payload: {
        kind: "addListener",
        listenerId: "listener.hunker-down.expire",
        eventKind: "turnStarted",
        conditions: [{ kind: "turnStartedIsListenerOwnerHero" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.hunker-down.remove",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              amount: HUNKER_DOWN_DODGE_BONUS,
              stat: "dodgeChance",
              duration: "persistent",
              changeKind: "removeMatching",
            },
            displayText: {
              template: "Hunker Down expires.",
            },
          },
        ],
      },
      displayText: {
        template: "Lose this dodge bonus at the start of your next turn.",
      },
    },
  ],
} satisfies StrongCardDefinition;

import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

export const BATTLE_FOCUS_CARD = {
  id: "card.commander-x.battle-focus",
  name: "Battle Focus",
  type: "ability",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 2,
  targeting: "none",
  tags: ["buff"],
  summaryText: {
    mode: "static",
    text: "Your next attack deals +2 extra damage.",
  },
  effects: [
    {
      id: "effect.battle-focus.attack-bonus",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackDamage",
        amount: 2,
        duration: "persistent",
      },
      displayText: {
        mode: "static",
        text: "Next attack deals +2 damage.",
      },
    },
    {
      id: "effect.battle-focus.consume-on-next-attack",
      payload: {
        kind: "addListener",
        listenerId: "listener.battle-focus.consume",
        eventKind: "damageApplied",
        conditions: [{ kind: "damageSourceIsListenerOwnerHero" }],
        lifetime: "once",
        effects: [
          {
            id: "effect.battle-focus.remove-attack-bonus",
            payload: {
              kind: "modifyStat",
              target: "sourceOwnerHero",
              stat: "attackDamage",
              amount: -2,
              duration: "persistent",
            },
            displayText: {
              mode: "static",
              text: "Remove Battle Focus bonus after your next attack.",
            },
          },
        ],
      },
      displayText: {
        mode: "static",
        text: "Consume this bonus after your next attack.",
      },
    },
  ],
} satisfies StrongCardDefinition;

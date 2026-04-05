import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID } from "../constants";

const BATTLE_FOCUS_ATTACK_BONUS = 2;

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
    template: "Your next attack deals +{amount} extra damage.",
    params: {
      amount: BATTLE_FOCUS_ATTACK_BONUS,
    },
  },
  effects: [
    {
      id: "effect.battle-focus.attack-bonus",
      payload: {
        kind: "modifyStat",
        target: "sourceOwnerHero",
        stat: "attackDamage",
        amount: BATTLE_FOCUS_ATTACK_BONUS,
        duration: "persistent",
        changeKind: "apply",
      },
      displayText: {
        template: "Next attack deals +{amount} damage.",
        params: {
          amount: BATTLE_FOCUS_ATTACK_BONUS,
        },
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
              amount: BATTLE_FOCUS_ATTACK_BONUS,
              duration: "persistent",
              changeKind: "removeMatching",
            },
            displayText: {
              template: "Remove Battle Focus +{amount} bonus after your next attack.",
              params: {
                amount: BATTLE_FOCUS_ATTACK_BONUS,
              },
            },
          },
        ],
      },
      displayText: {
        template: "Consume this bonus after your next attack.",
      },
    },
  ],
} satisfies StrongCardDefinition;

import type { CardDefinition } from "../../../shared/models";
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
        kind: "gainAttackDamage",
        target: "sourceOwnerHero",
        amount: 2,
      },
      displayText: {
        mode: "static",
        text: "Next attack deals +2 damage.",
      },
    },
  ],
} satisfies CardDefinition;

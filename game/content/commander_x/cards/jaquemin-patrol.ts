import type { StrongCardDefinition } from "./types";
import { COMMANDER_X_HERO_ID, SUMMON_ENTITY_IDS } from "../constants";

export const JAQUEMIN_PATROL_CARD = {
  id: "card.commander-x.jaquemin-patrol",
  name: "Jaquemin the Patrol",
  type: "companion",
  rarity: "common",
  heroId: COMMANDER_X_HERO_ID,
  moveCost: 6,
  targeting: "none",
  tags: ["chivalry"],
  summaryText: {
    mode: "static",
    text: "Summon Jaquemin the Patrol. Whenever you attack, it follows the same target.",
  },
  effects: [
    {
      id: "effect.jaquemin.summon",
      payload: {
        kind: "summonEntity",
        entityKind: "companion",
        entityDefinitionId: SUMMON_ENTITY_IDS.jaqueminPatrol,
        placement: "selectedEmptyPosition",
      },
      displayText: {
        mode: "static",
        text: "Summon Jaquemin the Patrol.",
      },
    },
    {
      id: "effect.jaquemin.follow-up-attack",
      payload: {
        kind: "addListener",
        listenerId: "listener.jaquemin.follow-up",
        eventKind: "damageApplied",
        sourceBinding: "lastSummonedEntity",
        conditions: [{ kind: "damageSourceIsListenerOwnerHero" }],
        lifetime: "persistent",
        effects: [
          {
            id: "effect.jaquemin.follow-up-attack.damage",
            payload: {
              kind: "dealDamage",
              target: "triggeringTarget",
              minimum: 2,
              maximum: 4,
              damageType: "physical",
              attackDamageScaling: 0.25,
              abilityPowerScaling: 0,
              armorScaling: 0,
              canBeDodged: true,
            },
            displayText: {
              mode: "static",
              text: "Jaquemin follows your attack with its own attack.",
            },
          },
        ],
      },
      displayText: {
        mode: "static",
        text: "Register Jaquemin's follow-up attack.",
      },
    },
  ],
} satisfies StrongCardDefinition;

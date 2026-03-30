import {
  type CardDefinition,
  type EntityFootprint,
  type HeroDefinition,
} from "../shared/models";
import type { SummonedEntityBlueprint } from "../engine/actions/effects/execute-card-effect.ts";
import type { EntityActiveProfile } from "../engine/actions/resolve-use-entity-active";

export const COMMANDER_X_HERO_ID = "hero.commander-x";

export const COMMANDER_X_HERO: HeroDefinition = {
  id: COMMANDER_X_HERO_ID,
  name: "Commander X",
  footprint: [
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 0, column: 2 },
  ],
  combat: {
    maxHealth: 60,
    armor: 2,
    magicResist: 2,
    attackDamage: 4,
    abilityPower: 0,
    criticalChance: 0.2,
    criticalMultiplier: 1.5,
    dodgeChance: 0.1,
  },
  basicAttack: {
    moveCost: 3,
    minimumDamage: 1,
    maximumDamage: 3,
    attackDamageScaling: 0.5,
    abilityPowerScaling: 0,
    damageType: "physical",
  },
  passiveText: "Your attacks restore 1 HP (if not dodged).",
};

export const SUMMON_ENTITY_IDS = {
  corrodedShortsword: "entity.weapon.corroded-shortsword",
  warStandard: "entity.totem.war-standard",
  guardSigil: "entity.totem.guard-sigil",
  jaqueminPatrol: "entity.companion.jaquemin-patrol",
} as const;

export const COMMANDER_X_CARDS: CardDefinition[] = [
  {
    id: "card.general.reroll",
    name: "Reroll",
    type: "ability",
    rarity: "general",
    moveCost: 1,
    targeting: "none",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Draw a card.",
    },
    effects: [
      {
        id: "effect.reroll.draw",
        payload: {
          kind: "drawCards",
          target: "sourceOwnerHero",
          amount: 1,
        },
        displayText: {
          mode: "static",
          text: "Draw 1 card.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.iron-skin",
    name: "Iron Skin",
    type: "ability",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 5,
    targeting: "none",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Gain 1 armor.",
    },
    effects: [
      {
        id: "effect.iron-skin.gain-armor",
        payload: {
          kind: "gainArmor",
          target: "sourceOwnerHero",
          amount: 1,
        },
        displayText: {
          mode: "static",
          text: "Gain 1 armor.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.health-potion",
    name: "Health Potion",
    type: "ability",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 4,
    targeting: "none",
    tags: ["heal"],
    summaryText: {
      mode: "static",
      text: "Restore 2-4 HP to your hero.",
    },
    effects: [
      {
        id: "effect.health-potion.heal",
        payload: {
          kind: "heal",
          target: "sourceOwnerHero",
          minimum: 2,
          maximum: 4,
        },
        displayText: {
          mode: "static",
          text: "Restore 2-4 HP.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.bastion-stance",
    name: "Bastion Stance",
    type: "ability",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 1,
    targeting: "none",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Gain +1 armor and +1 magic resist.",
    },
    effects: [
      {
        id: "effect.bastion-stance.gain-armor",
        payload: {
          kind: "gainArmor",
          target: "sourceOwnerHero",
          amount: 1,
        },
        displayText: {
          mode: "static",
          text: "Gain 1 armor.",
        },
      },
      {
        id: "effect.bastion-stance.gain-mr",
        payload: {
          kind: "gainMagicResist",
          target: "sourceOwnerHero",
          amount: 1,
        },
        displayText: {
          mode: "static",
          text: "Gain 1 magic resist.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.shield-toss",
    name: "Shield Toss",
    type: "ability",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 5,
    targeting: "selectedAny",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Deal 3 damage (scales with armor).",
    },
    effects: [
      {
        id: "effect.shield-toss.damage",
        payload: {
          kind: "dealDamage",
          target: "selectedAny",
          minimum: 3,
          maximum: 3,
          damageType: "physical",
          attackDamageScaling: 0,
          abilityPowerScaling: 0,
          armorScaling: 1,
          canBeDodged: true,
        },
        displayText: {
          mode: "static",
          text: "Deal 3 damage plus armor scaling.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.chaaarge",
    name: "Chaaarge!",
    type: "ability",
    rarity: "ultimate",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 10,
    targeting: "selectedEnemy",
    tags: ["refund"],
    summaryText: {
      mode: "static",
      text: "Deal 2-10 damage to an enemy. If not dodged, refund move cost.",
    },
    effects: [
      {
        id: "effect.chaaarge.damage",
        payload: {
          kind: "dealDamage",
          target: "selectedEnemy",
          minimum: 2,
          maximum: 10,
          damageType: "physical",
          attackDamageScaling: 1,
          abilityPowerScaling: 0,
          armorScaling: 0,
          canBeDodged: true,
        },
        displayText: {
          mode: "static",
          text: "Deal 2-10 physical damage.",
        },
      },
      {
        id: "effect.chaaarge.refund",
        payload: {
          kind: "refundMoveCost",
          amount: 10,
          condition: "ifNotDodged",
        },
        displayText: {
          mode: "static",
          text: "If not dodged, refund move cost.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.corroded-shortsword",
    name: "Corroded Shortsword",
    type: "weapon",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 5,
    targeting: "none",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Summon Corroded Shortsword.",
    },
    effects: [
      {
        id: "effect.corroded-shortsword.summon",
        payload: {
          kind: "summonEntity",
          entityKind: "weapon",
          entityDefinitionId: SUMMON_ENTITY_IDS.corrodedShortsword,
          placement: "selectedEmptyPosition",
        },
        displayText: {
          mode: "static",
          text: "Summon your weapon.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.war-standard",
    name: "War Standard",
    type: "totem",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 2,
    targeting: "none",
    tags: ["buff"],
    summaryText: {
      mode: "static",
      text: "Summon War Standard.",
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
          mode: "static",
          text: "Summon War Standard.",
        },
      },
    ],
  },
  {
    id: "card.commander-x.guard-sigil",
    name: "Guard Sigil",
    type: "totem",
    rarity: "common",
    heroId: COMMANDER_X_HERO_ID,
    moveCost: 3,
    targeting: "none",
    tags: [],
    summaryText: {
      mode: "static",
      text: "Summon Guard Sigil.",
    },
    effects: [
      {
        id: "effect.guard-sigil.summon",
        payload: {
          kind: "summonEntity",
          entityKind: "totem",
          entityDefinitionId: SUMMON_ENTITY_IDS.guardSigil,
          placement: "selectedEmptyPosition",
        },
        displayText: {
          mode: "static",
          text: "Summon Guard Sigil.",
        },
      },
    ],
  },
  {
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
      text: "Summon Jaquemin the Patrol.",
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
    ],
  },
];

export const COMMANDER_X_SUMMONED_BLUEPRINTS: Record<string, SummonedEntityBlueprint> = {
  [SUMMON_ENTITY_IDS.corrodedShortsword]: {
    kind: "weapon",
    definitionCardId: "card.commander-x.corroded-shortsword",
    maxHealth: 14,
    armor: 0,
    magicResist: 0,
    attackDamage: 0,
    abilityPower: 0,
    criticalChance: 0,
    criticalMultiplier: 1,
    dodgeChance: 0,
    maxMovesPerTurn: 1,
    remainingMoves: 1,
  },
  [SUMMON_ENTITY_IDS.warStandard]: {
    kind: "totem",
    definitionCardId: "card.commander-x.war-standard",
    maxHealth: 10,
    armor: 0,
    magicResist: 0,
    attackDamage: 0,
    abilityPower: 0,
    criticalChance: 0,
    criticalMultiplier: 1,
    dodgeChance: 0,
    maxMovesPerTurn: 0,
    remainingMoves: 0,
  },
  [SUMMON_ENTITY_IDS.guardSigil]: {
    kind: "totem",
    definitionCardId: "card.commander-x.guard-sigil",
    maxHealth: 5,
    armor: 1,
    magicResist: 1,
    attackDamage: 0,
    abilityPower: 0,
    criticalChance: 0,
    criticalMultiplier: 1,
    dodgeChance: 0,
    maxMovesPerTurn: 0,
    remainingMoves: 0,
  },
  [SUMMON_ENTITY_IDS.jaqueminPatrol]: {
    kind: "companion",
    definitionCardId: "card.commander-x.jaquemin-patrol",
    maxHealth: 20,
    armor: 1,
    magicResist: 0,
    attackDamage: 0,
    abilityPower: 0,
    criticalChance: 0.1,
    criticalMultiplier: 1.5,
    dodgeChance: 0.1,
    maxMovesPerTurn: 1,
    remainingMoves: 1,
  },
};

export const COMMANDER_X_ENTITY_ACTIVE_PROFILES: Record<string, EntityActiveProfile> = {
  [SUMMON_ENTITY_IDS.corrodedShortsword]: {
    moveCost: 1,
    minimumDamage: 2,
    maximumDamage: 6,
    damageType: "physical",
    attackDamageScaling: 0.5,
    abilityPowerScaling: 0,
    canBeDodged: true,
  },
  [SUMMON_ENTITY_IDS.jaqueminPatrol]: {
    moveCost: 1,
    minimumDamage: 1,
    maximumDamage: 2,
    damageType: "physical",
    attackDamageScaling: 0.25,
    abilityPowerScaling: 0,
    canBeDodged: true,
  },
};

export const COMMANDER_X_SUMMON_FOOTPRINTS: Record<string, EntityFootprint> = {
  [SUMMON_ENTITY_IDS.corrodedShortsword]: [{ row: 0, column: 0 }],
  [SUMMON_ENTITY_IDS.warStandard]: [{ row: 0, column: 0 }],
  [SUMMON_ENTITY_IDS.guardSigil]: [{ row: 0, column: 0 }],
  [SUMMON_ENTITY_IDS.jaqueminPatrol]: [{ row: 0, column: 0 }],
};

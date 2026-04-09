export type GridPosition = {
  row: number
  column: number
}

export type HeroBootstrapConfig = {
  heroEntityId: string
  heroDefinitionId: string
  openingMovePoints: number
  startAnchorPosition: GridPosition
  openingDeckCardIds: string[]
}

export type GameBootstrapConfig = {
  battleId: string
  seed: string
  battlefieldRows: number
  battlefieldColumns: number
  openingHandSize: number
  heroes: [HeroBootstrapConfig, HeroBootstrapConfig]
}

export const HERO_IDS = {
  commanderX: 'hero.commander-x',
} as const

export const CARD_IDS = {
  reroll: 'card.general.reroll',
  hunkerDown: 'card.general.hunker-down',
  resetLuck: 'card.general.reset-luck',
  ironSkin: 'card.commander-x.iron-skin',
  healthPotion: 'card.commander-x.health-potion',
  bastionStance: 'card.commander-x.bastion-stance',
  battleFocus: 'card.commander-x.battle-focus',
  medalOfHonor: 'card.commander-x.medal-of-honor',
  shatterPlating: 'card.commander-x.shatter-plating',
  shieldToss: 'card.commander-x.shield-toss',
  warcry: 'card.commander-x.warcry',
  chaaarge: 'card.commander-x.chaaarge',
  corrodedShortsword: 'card.commander-x.corroded-shortsword',
  defiledGreatsword: 'card.commander-x.defiled-greatsword',
  glintingAdamantiteBlade: 'card.commander-x.glinting-adamantite-blade',
  shamanicTitaniumPummeler: 'card.commander-x.shamanic-titanium-pummeler',
  warStandard: 'card.commander-x.war-standard',
  guardSigil: 'card.commander-x.guard-sigil',
  healingFortress: 'card.commander-x.healing-fortress',
  evergrowthIdol: 'card.commander-x.evergrowth-idol',
  jaqueminPatrol: 'card.commander-x.jaquemin-patrol',
} as const

// Edit these lists to define reusable deck presets for scenarios.
export const STARTER_DECKS = {
  commanderXCore: [
    CARD_IDS.chaaarge,
    CARD_IDS.reroll,
    CARD_IDS.corrodedShortsword,
    CARD_IDS.corrodedShortsword,
    CARD_IDS.jaqueminPatrol,
    CARD_IDS.warStandard,
    CARD_IDS.warStandard,
    CARD_IDS.guardSigil,
    CARD_IDS.guardSigil,
    CARD_IDS.healthPotion,
    CARD_IDS.healthPotion,
    CARD_IDS.ironSkin,
    CARD_IDS.bastionStance,
    CARD_IDS.battleFocus,
    CARD_IDS.shieldToss,
  ],
} as const

// Main editable create-battle payload used by app bootstrap preview.
export const DEFAULT_GAME_BOOTSTRAP_CONFIG: GameBootstrapConfig = {
  battleId: 'demo-battle-001',
  seed: 'ui-seed-003',
  battlefieldRows: 6,
  battlefieldColumns: 5,
  openingHandSize: 4,
  heroes: [
    {
      heroEntityId: 'hero-a',
      heroDefinitionId: HERO_IDS.commanderX,
      openingMovePoints: 3,
      startAnchorPosition: { row: 0, column: 1 },
      openingDeckCardIds: [...STARTER_DECKS.commanderXCore],
    },
    {
      heroEntityId: 'hero-b',
      heroDefinitionId: HERO_IDS.commanderX,
      openingMovePoints: 3,
      startAnchorPosition: { row: 5, column: 1 },
      openingDeckCardIds: [...STARTER_DECKS.commanderXCore],
    },
  ],
}
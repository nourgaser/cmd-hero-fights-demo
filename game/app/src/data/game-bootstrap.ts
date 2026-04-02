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
  ironSkin: 'card.commander-x.iron-skin',
  healthPotion: 'card.commander-x.health-potion',
  bastionStance: 'card.commander-x.bastion-stance',
  battleFocus: 'card.commander-x.battle-focus',
  shieldToss: 'card.commander-x.shield-toss',
  chaaarge: 'card.commander-x.chaaarge',
  corrodedShortsword: 'card.commander-x.corroded-shortsword',
  warStandard: 'card.commander-x.war-standard',
  guardSigil: 'card.commander-x.guard-sigil',
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
  seed: 'ui-seed-001',
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
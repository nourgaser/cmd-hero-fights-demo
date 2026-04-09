import { CARD_IDS } from './game-bootstrap.ts'

export type VisualIconMeta = {
  id: string
  label?: string
  description?: string
  colorVar?: string
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
}

export const SIDE_VISUALS = {
  a: {
    name: 'Player A',
    sideColorVar: '--side-a',
  },
  b: {
    name: 'Player B',
    sideColorVar: '--side-b',
  },
} as const

export const ENTITY_ICON_META: Record<'hero' | 'weapon' | 'totem' | 'companion', VisualIconMeta> = {
  hero: { id: 'game-icons:visored-helm', label: 'Hero', description: 'Main fighter on this side.' },
  weapon: { id: 'game-icons:broadsword', label: 'Weapon', description: 'A weapon unit on the field.' },
  totem: { id: 'game-icons:obelisk', label: 'Totem', description: 'A totem with an ongoing effect.' },
  companion: { id: 'game-icons:wolf-head', label: 'Companion', description: 'A companion unit supporting this side.' },
}

export const CARD_ICON_META: Record<string, VisualIconMeta> = {
  [CARD_IDS.reroll]: { id: 'game-icons:perspective-dice-six-faces-random', label: 'Reroll', description: 'Draw cards to refresh your hand.' },
  [CARD_IDS.ironSkin]: { id: 'game-icons:layered-armor', label: 'Iron Skin', description: 'Gain armor.' },
  [CARD_IDS.healthPotion]: { id: 'game-icons:health-potion', label: 'Health Potion', description: 'Restore health.' },
  [CARD_IDS.bastionStance]: { id: 'game-icons:checked-shield', label: 'Bastion Stance', description: 'Boost defense for this turn.' },
  [CARD_IDS.battleFocus]: { id: 'game-icons:targeting', label: 'Battle Focus', description: 'Set up your next strike.' },
  [CARD_IDS.medalOfHonor]: { id: 'game-icons:medal', label: 'Medal of Honor', description: 'Empower an allied companion and grant immunity.' },
  [CARD_IDS.shieldToss]: { id: 'game-icons:round-shield', label: 'Shield Toss', description: 'Deal damage using your defense.' },
  [CARD_IDS.chaaarge]: { id: 'game-icons:charging-bull', label: 'Chaaarge!', description: 'A heavy burst attack.' },
  [CARD_IDS.corrodedShortsword]: { id: 'game-icons:rusty-sword', label: 'Corroded Shortsword', description: 'Summon your weapon.' },
  [CARD_IDS.defiledGreatsword]: { id: 'game-icons:broadsword', label: 'Defiled Greatsword', description: 'Summon your weapon.' },
  [CARD_IDS.glintingAdamantiteBlade]: { id: 'game-icons:sword-clash', label: 'Glinting Adamantite Blade', description: 'Summon your weapon.' },
  [CARD_IDS.shamanicTitaniumPummeler]: { id: 'game-icons:thor-hammer', label: 'Shamanic Titanium Pummeler', description: 'Summon your heavy weapon.' },
  [CARD_IDS.warStandard]: { id: 'game-icons:vertical-banner', label: 'War Standard', description: 'Summon a buff totem.' },
  [CARD_IDS.guardSigil]: { id: 'game-icons:magic-shield', label: 'Guard Sigil', description: 'Summon a defense totem.' },
  [CARD_IDS.jaqueminPatrol]: { id: 'game-icons:knight-banner', label: 'Jaquemin the Patrol', description: 'Summon your companion.' },
}

export const LUCK_VISUALS = {
  capacity: 4,
  iconId: 'game-icons:shamrock',
  label: 'Luck',
  description: 'When luck moves to your side, your side gets the edge.',
  pipOffColorVar: '--luck-off',
  sideAOnColorVar: '--luck-on-a',
  sideBOnColorVar: '--luck-on-b',
} as const

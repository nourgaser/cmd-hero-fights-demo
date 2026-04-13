import { CARD_IDS } from './game-bootstrap'

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
  [CARD_IDS.hunkerDown]: { id: 'game-icons:shield-echoes', label: 'Hunker Down', description: 'Brace and hold the line.' },
  [CARD_IDS.resetLuck]: { id: 'game-icons:shamrock', label: 'Reset Luck', description: 'Shift luck back to neutral.', hFlip: true },
  [CARD_IDS.ironSkin]: { id: 'game-icons:layered-armor', label: 'Iron Skin', description: 'Gain armor.' },
  [CARD_IDS.healthPotion]: { id: 'game-icons:health-potion', label: 'Health Potion', description: 'Restore health.' },
  [CARD_IDS.bastionStance]: { id: 'game-icons:checked-shield', label: 'Bastion Stance', description: 'Boost defense for this turn.' },
  [CARD_IDS.battleFocus]: { id: 'game-icons:targeting', label: 'Battle Focus', description: 'Set up your next strike.' },
  [CARD_IDS.medalOfHonor]: { id: 'game-icons:medal', label: 'Medal of Honor', description: 'Empower an allied companion and grant immunity.' },
  [CARD_IDS.shatterPlating]: { id: 'game-icons:shield-reflect', label: 'Shatter Plating', description: 'Break armor and strike through it.' },
  [CARD_IDS.shieldToss]: { id: 'game-icons:round-shield', label: 'Shield Toss', description: 'Deal damage using your defense.' },
  [CARD_IDS.warcry]: { id: 'game-icons:crossed-swords', label: 'Warcry', description: 'Rally into a stronger assault.', hFlip: true },
  [CARD_IDS.chaaarge]: { id: 'game-icons:charging-bull', label: 'Chaaarge!', description: 'A heavy burst attack.' },
  [CARD_IDS.corrodedShortsword]: { id: 'game-icons:rusty-sword', label: 'Corroded Shortsword', description: 'Summon your weapon.' },
  [CARD_IDS.defiledGreatsword]: { id: 'game-icons:broadsword', label: 'Defiled Greatsword', description: 'Summon your weapon.' },
  [CARD_IDS.glintingAdamantiteBlade]: { id: 'game-icons:sword-clash', label: 'Glinting Adamantite Blade', description: 'Summon your weapon.' },
  [CARD_IDS.shamanicTitaniumPummeler]: { id: 'game-icons:thor-hammer', label: 'Shamanic Titanium Pummeler', description: 'Summon your heavy weapon.' },
  [CARD_IDS.warStandard]: { id: 'game-icons:vertical-banner', label: 'War Standard', description: 'Summon a buff totem.' },
  [CARD_IDS.guardSigil]: { id: 'game-icons:magic-shield', label: 'Guard Sigil', description: 'Summon a defense totem.' },
  [CARD_IDS.healingFortress]: { id: 'game-icons:magic-shield', label: 'Healing Fortress', description: 'Summon a taunt totem that boosts attack healing.' },
  [CARD_IDS.evergrowthIdol]: { id: 'game-icons:obelisk', label: 'Evergrowth Idol', description: 'Summon a totem that grants periodic growth.' },
  [CARD_IDS.bannerOfX]: { id: 'game-icons:vertical-banner', label: 'Banner of X', description: 'Summon a totem that boosts allied move capacity.' },
  [CARD_IDS.jaqueminPatrol]: { id: 'game-icons:knight-banner', label: 'Jaquemin the Patrol', description: 'Summon your companion.' },
  [CARD_IDS.reactiveBulwark]: { id: 'game-icons:surrounded-shield', label: 'Reactive Bulwark', description: 'Convert defense into retaliation.' },
  [CARD_IDS.steelboundEffigy]: { id: 'game-icons:visored-helm', label: 'Steelbound Effigy', description: 'A totem forged from your armor.', vFlip: true },
  [CARD_IDS.bulwarkOfFortune]: { id: 'game-icons:shield-echoes', label: 'Bulwark of Fortune', description: 'A protective totem that gifts health.', vFlip: true },
  [CARD_IDS.commonExpendableDeadlyMan]: { id: 'game-icons:swordman', label: 'A Common, Expendable, but Deadly Man', description: 'A cheap but dangerous companion.' },
  [CARD_IDS.merewenTheShieldmaiden]: { id: 'game-icons:shield-reflect', label: 'Merewen the Shieldmaiden', description: 'A taunting shieldmaiden who reflects danger.' },
  [CARD_IDS.riquierTheBear]: { id: 'game-icons:wolf-head', label: 'Riquier the Bear', description: 'A vengeful companion that counterattacks.', hFlip: true },
  [CARD_IDS.veteranEdge]: { id: 'game-icons:knife', label: 'Veteran Edge', description: 'A precise basic-attack enhancer.' },
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

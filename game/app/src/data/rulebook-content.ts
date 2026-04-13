export type RulebookDiagramKind = 'start' | 'turn' | 'cards' | 'battlefield' | 'luck' | 'deck' | 'glossary'

export type RulebookQuickFact = {
  icon: string
  label: string
  value: string
}

export type RulebookSection = {
  id: string
  title: string
  icon: string
  summary: string
  bullets: string[]
  diagram: RulebookDiagramKind
}

export const RULEBOOK_TITLE = 'Rulebook'
export const RULEBOOK_SUBTITLE = 'A quick guide for new players'

export const RULEBOOK_QUICK_FACTS: RulebookQuickFact[] = [
  {
    icon: 'game-icons:crossed-swords',
    label: 'Main goal',
    value: 'Reduce the enemy hero to 0 health before they do the same to you.',
  },
  {
    icon: 'game-icons:stack',
    label: 'Hand size',
    value: 'At the start of your turn, if you have fewer than 4 cards, you draw 1 card. You can never hold more than 7.',
  },
  {
    icon: 'game-icons:shamrock',
    label: 'Luck',
    value: 'Each luck point shifts certain rolls by 25%.',
  },
  {
    icon: 'game-icons:two-coins',
    label: 'Turn choices',
    value: 'On your turn, choose the best mix and order of attacks, cards, luck, and unit actions.',
  },
]

export const RULEBOOK_SECTIONS: RulebookSection[] = [
  {
    id: 'start',
    title: 'Start Here',
    icon: 'game-icons:open-book',
    summary: 'CMD Hero Fights is a tactical card battle where you play cards from your hand onto a battlefield grid.',
    bullets: [
      'Your main goal is simple: reduce the enemy hero to 0 health first.',
      'You manage two spaces at once: your hand (what you can play) and the battlefield (where those plays matter).',
      'You control one hero and a deck of abilities, weapons, totems, and companions.',
      'Every action costs move points, so each turn is about spending your points wisely.',
      'Most cards ask you to pick a target or place a unit on the board.',
    ],
    diagram: 'start',
  },
  {
    id: 'turns',
    title: 'How a Turn Works',
    icon: 'game-icons:clockwork',
    summary: 'Each turn follows a simple loop: draw if your hand is low, spend move points, then pass the turn.',
    bullets: [
      'At the start of your turn, if you have fewer than 4 cards, you draw exactly 1 card.',
      'Your hand has a hard limit of 7 cards.',
      'You can spend hero move points on any mix of basic attacks, card plays, and the luck button.',
      'The luck button can be used once per turn and costs 3 move points.',
      'Order matters: you can attack first, play cards first, or alternate based on what gives the best outcome.',
      'Weapons and companions use their own move pools, so their actions do not spend your hero move points.',
      'Before committing, compare your damage ranges with enemy health and armor to avoid risky low-roll lines.',
      'When you are done, end your turn so the other side can play.',
    ],
    diagram: 'turn',
  },
  {
    id: 'cards',
    title: 'Cards and Units',
    icon: 'game-icons:card-pick',
    summary: 'Cards are grouped by role so you can quickly understand what each play is good for.',
    bullets: [
      'Abilities are flexible one-off plays that help you adapt each turn.',
      'Weapons add direct combat pressure and open stronger attack lines.',
      'Totems stay on the board and provide ongoing value over time.',
      'Companions add extra units that can pressure space and create new threats.',
      'Weapons and companions can have active actions with their own move budgets.',
    ],
    diagram: 'cards',
  },
  {
    id: 'battlefield',
    title: 'Battlefield and Targeting',
    icon: 'game-icons:stone-pile',
    summary: 'The board is the heart of the game. Placement changes what is safe, what is exposed, and what can be targeted.',
    bullets: [
      'Units occupy exact slots, so there is no free movement once space fills up.',
      'Nearby allies can grant useful defensive or support bonuses.',
      'Some cards hit one target, some affect nearby targets, and some affect the whole board.',
      'Protecting key units can force your opponent into worse attacks.',
      'Health and armor both matter when planning finishes: armor soaks damage before health drops.',
    ],
    diagram: 'battlefield',
  },
  {
    id: 'luck',
    title: 'Luck and Randomness',
    icon: 'game-icons:shamrock',
    summary: 'Luck gently pushes certain rolls up or down. It is strongest when outcomes are close.',
    bullets: [
      'Each luck point shifts an outcome by 25% toward the high or low end of its range.',
      'Positive luck helps your side roll higher values, while negative luck does the opposite.',
      'Think of luck as a small nudge, not a guarantee.',
    ],
    diagram: 'luck',
  },
  {
    id: 'deck',
    title: 'Deck Building',
    icon: 'game-icons:stack',
    summary: 'A good deck mixes reliable core plays with situational tools for different board states.',
    bullets: [
      'Ultimate cards are more restricted than regular cards, so use them deliberately.',
      'Include cards that solve real in-game situations, not just cards that look strong on paper.',
      'Start simple, then adjust your list after a few matches.',
    ],
    diagram: 'deck',
  },
  {
    id: 'glossary',
    title: 'Terms and Interface Help',
    icon: 'game-icons:help',
    summary: 'If a word or control is unclear, use this section for quick plain-language definitions.',
    bullets: [
      'Hand draw rule: at the start of your turn, if you have fewer than 4 cards, you draw 1 card.',
      'Hand limit: you can never hold more than 7 cards at once.',
      'Hero move points: the points your hero spends on basic attacks, playing cards, and pressing luck.',
      'Unit move points: weapons and companions often have their own move points for their active actions.',
      'Targeting: click or tap a highlighted unit or board slot to confirm your action.',
      'Rulebook button: opens this fullscreen guide from the top-right controls.',
    ],
    diagram: 'glossary',
  },
]
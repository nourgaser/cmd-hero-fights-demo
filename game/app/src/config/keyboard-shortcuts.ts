export const SHORTCUT_CARD_SLOTS = 7

export const SHORTCUT_KEYS = {
  endTurn: {
    code: 'KeyE',
    label: 'E',
    description: 'End turn',
  },
  basicAttack: {
    code: 'KeyA',
    label: 'A',
    description: 'Basic attack',
  },
  pressLuck: {
    code: 'KeyL',
    label: 'L',
    description: 'Press luck',
  },
  cardSlots: Array.from({ length: SHORTCUT_CARD_SLOTS }, (_, index) => ({
    code: `Digit${index + 1}`,
    label: `${index + 1}`,
    description: `Play/focus card slot ${index + 1}`,
  })),
} as const

const FIRST_CARD_SLOT_SHORTCUT = SHORTCUT_KEYS.cardSlots[0]
const LAST_CARD_SLOT_SHORTCUT = SHORTCUT_KEYS.cardSlots[SHORTCUT_KEYS.cardSlots.length - 1]

export type KeyboardShortcutAction =
  | { kind: 'endTurn' }
  | { kind: 'basicAttack' }
  | { kind: 'pressLuck' }
  | { kind: 'cardSlot'; slotIndex: number }

export type KeyboardShortcutHintRow = {
  key: string
  description: string
}

export const KEYBOARD_SHORTCUT_HINT_ROWS: KeyboardShortcutHintRow[] = [
  { key: SHORTCUT_KEYS.endTurn.label, description: SHORTCUT_KEYS.endTurn.description },
  { key: SHORTCUT_KEYS.basicAttack.label, description: SHORTCUT_KEYS.basicAttack.description },
  { key: SHORTCUT_KEYS.pressLuck.label, description: SHORTCUT_KEYS.pressLuck.description },
  ...(FIRST_CARD_SLOT_SHORTCUT && LAST_CARD_SLOT_SHORTCUT
    ? [{ key: `${FIRST_CARD_SLOT_SHORTCUT.label}-${LAST_CARD_SLOT_SHORTCUT.label}`, description: 'Focus/play hand card slots' }]
    : []),
]

function normalizeCode(code: string): string {
  return code.toLowerCase()
}

export function resolveKeyboardShortcutAction(event: KeyboardEvent): KeyboardShortcutAction | null {
  const code = normalizeCode(event.code)

  if (code === normalizeCode(SHORTCUT_KEYS.endTurn.code)) {
    return { kind: 'endTurn' }
  }

  if (code === normalizeCode(SHORTCUT_KEYS.basicAttack.code)) {
    return { kind: 'basicAttack' }
  }

  if (code === normalizeCode(SHORTCUT_KEYS.pressLuck.code)) {
    return { kind: 'pressLuck' }
  }

  for (let index = 0; index < SHORTCUT_KEYS.cardSlots.length; index += 1) {
    const slot = SHORTCUT_KEYS.cardSlots[index]
    if (slot && code === normalizeCode(slot.code)) {
      return { kind: 'cardSlot', slotIndex: index }
    }
  }

  return null
}

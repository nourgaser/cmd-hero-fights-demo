export const STAT_METADATA = {
  attackDamage: { label: 'attack damage', shortLabel: 'AD', iconId: 'game-icons:broadsword' },
  attackFlatBonusDamage: { label: 'flat attack bonus', shortLabel: 'ATK+', iconId: 'game-icons:crossed-swords' },
  basicAttackFlatBonusDamage: { label: 'basic attack flat bonus', shortLabel: 'BASIC+', iconId: 'game-icons:crossed-swords' },
  attackHealOnAttack: { label: 'attack heal', shortLabel: 'ATK HEAL', iconId: 'game-icons:health-normal' },
  abilityPower: { label: 'ability power', shortLabel: 'AP', iconId: 'game-icons:magic-swirl' },
  armor: { label: 'armor', shortLabel: 'AR', iconId: 'game-icons:checked-shield' },
  magicResist: { label: 'magic resist', shortLabel: 'MR', iconId: 'game-icons:shield-reflect' },
  sharpness: { label: 'sharpness', shortLabel: 'Sharp', iconId: 'game-icons:knife' },
  basicAttackSharpness: { label: 'basic attack sharpness', shortLabel: 'BSharp', iconId: 'game-icons:knife' },
} as const

export type StatKey = keyof typeof STAT_METADATA

export function formatPreviewNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

export function formatSignedDelta(value: number): string {
  const formatted = formatPreviewNumber(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

export function formatLayeredValue(base: number, delta: number): string {
  if (delta === 0) {
    return formatPreviewNumber(base)
  }

  return `(${formatPreviewNumber(base)} ${formatSignedDelta(delta)})`
}

export function renderTemplatedText(displayText?: {
  template?: string
  params?: Record<string, string | number | boolean | undefined>
}): string | null {
  if (!displayText?.template) {
    return null
  }

  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params?.[key]
    return value === undefined ? match : String(value)
  })
}

export function formatKeywordLabel(name: string, params?: Record<string, string | number | boolean | undefined>): string {
  const values = params
    ? Object.values(params).filter((value) => value !== undefined).map((value) => String(value))
    : []

  if (values.length === 0) {
    return name
  }

  return `${name} (${values.join(', ')})`
}

export function labelForAuraKind(auraKind: string): string {
  switch (auraKind) {
    case 'reactiveBulwarkResistance':
      return 'Reactive Bulwark'
    default:
      return auraKind
  }
}

export function iconForAuraKind(auraKind: string): string {
  switch (auraKind) {
    case 'reactiveBulwarkResistance':
      return 'game-icons:shield-echoes'
    default:
      return 'game-icons:checked-shield'
  }
}

export function formatPropertyPathLabel(propertyPath: string): string {
  if (propertyPath in STAT_METADATA) {
    const stat = STAT_METADATA[propertyPath as keyof typeof STAT_METADATA]
    return stat.shortLabel
  }

  return propertyPath
}

export function summarizeNumericOperation(operation: 'add' | 'subtract' | 'set', value: number, propertyPath: string): string {
  const propertyLabel = formatPropertyPathLabel(propertyPath)
  if (operation === 'set') {
    return `${propertyLabel} = ${formatPreviewNumber(value)}`
  }

  const signed = operation === 'add' ? value : -value
  return `${signed >= 0 ? '+' : '-'}${formatPreviewNumber(Math.abs(signed))} ${propertyLabel}`
}

export function describeLifetime(lifetime: string): string {
  switch (lifetime) {
    case 'untilEndOfTurn':
      return 'Until end of turn'
    case 'untilSourceRemoved':
      return 'While source remains'
    case 'once':
      return 'One-time trigger'
    case 'persistent':
      return 'Persistent'
    default:
      return lifetime
  }
}

export function titleCaseWords(input: string): string {
  return input
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function prettifyEventOrConditionKind(value: string): string {
  return titleCaseWords(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
}

export function formatListenerLabel(listenerId: string): string {
  const normalized = listenerId
    .replace(/^listener\./, '')
    .replace(/^[a-z0-9-]+:passive:/i, 'passive:')
    .replace(/[._:-]+/g, ' ')
    .trim()

  if (!normalized) {
    return 'Timed Passive'
  }

  return titleCaseWords(normalized)
}

export function isHeroPassiveListener(listenerId: string): boolean {
  return listenerId.includes(':passive:') || listenerId.includes('.passive.')
}

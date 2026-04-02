export function roundWhole(value: number): number {
  return Math.round(value)
}

export function toAppliedDamage(roll: number, resistance: number): number {
  return Math.max(0, roundWhole(roll - resistance))
}

export function toHealAmount(roll: number): number {
  return Math.max(0, roundWhole(roll))
}
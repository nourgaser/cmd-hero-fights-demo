export function computeScaledDamageRange(options: {
  minimum: number;
  maximum: number;
  attackDamage: number;
  abilityPower: number;
  armor?: number;
  attackDamageScaling: number;
  abilityPowerScaling: number;
  armorScaling?: number;
}): { minimum: number; maximum: number } {
  const {
    minimum,
    maximum,
    attackDamage,
    abilityPower,
    armor = 0,
    attackDamageScaling,
    abilityPowerScaling,
    armorScaling = 0,
  } = options;

  const delta =
    attackDamage * attackDamageScaling +
    abilityPower * abilityPowerScaling +
    armor * armorScaling;

  return {
    minimum: minimum + delta,
    maximum: maximum + delta,
  };
}
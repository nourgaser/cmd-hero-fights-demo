import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.veteran-edge', () => {
  it('permanently gives basic attacks +1 damage and Sharpness 1', () => {
    let neutral = TEST_SIM.createSim({
      seed: 'veteran-1',
      deck: [],
      opponentDeck: [],
      openingHandSize: 0,
      openingMovePoints: 10,
    })
    let buffed = TEST_SIM.createSim({
      seed: 'veteran-1',
      deck: [CARD_IDS.veteranEdge],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const buffedHeroId = TEST_QUERIES.getActiveHero(buffed)
    const buffedEnemyId = TEST_QUERIES.getOpponentHero(buffed)

    buffed = TEST_ACTIONS.playCard(buffed, CARD_IDS.veteranEdge)

    const modifierPaths = buffed.session.state.activeModifiers.map((modifier) => modifier.propertyPath)
    expect(modifierPaths).toContain('basicAttackSharpness')
    expect(modifierPaths).toContain('basicAttackFlatBonusDamage')

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    buffed = TEST_ACTIONS.basicAttack(buffed, buffedEnemyId)

    const neutralDamage = TEST_QUERIES.eventsOfKind(neutral.lastEvents, 'damageApplied')[0]
    const buffedDamage = TEST_QUERIES.eventsOfKind(buffed.lastEvents, 'damageApplied')[0]

    expect(neutralDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.rngRawRoll).toBeCloseTo(neutralDamage?.rngRawRoll ?? 0, 12)
    expect(buffedDamage?.amount).toBe((neutralDamage?.amount ?? 0) + 2)
    expect(TEST_QUERIES.getEntityPreview(buffed, buffedEnemyId).armor).toBe(1)

    const remainingModifierPaths = buffed.session.state.activeModifiers.map(
      (modifier) => modifier.propertyPath,
    )
    expect(remainingModifierPaths).toContain('basicAttackSharpness')
    expect(remainingModifierPaths).toContain('basicAttackFlatBonusDamage')
    expect(TEST_QUERIES.getActiveHero(buffed)).toBe(buffedHeroId)
  })
})

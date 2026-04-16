import { describe, expect, it } from 'vitest'

import {
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_ASSERTIONS
} from '../simulation-test-utils'

function lastDamageEvent(sim: ReturnType<typeof TEST_SIM.createSim>) {
  const event = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
  expect(event).toBeDefined()
  return event!
}

describe('mechanic.luck', () => {
  it('shifts rolls toward the favored hero and away from the other hero', () => {
    let neutral = TEST_SIM.createSim({
      seed: 'luck-1',
      openingHandSize: 0,
      openingMovePoints: 6,
    })
    let favored = TEST_SIM.createSim({
      seed: 'luck-1',
      openingHandSize: 0,
      openingMovePoints: 6,
    })

    favored = TEST_ACTIONS.pressLuck(favored)
    expect(favored.session.state.luck.balance).toBe(1)

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    favored = TEST_ACTIONS.basicAttack(favored, TEST_QUERIES.getOpponentHero(favored))

    const neutralFirstAttack = lastDamageEvent(neutral)
    const favoredFirstAttack = lastDamageEvent(favored)

    expect(favoredFirstAttack.rngRawRoll).toBeCloseTo(neutralFirstAttack.rngRawRoll!, 12)
    expect(favoredFirstAttack.rngDodgeRoll).toBeCloseTo(neutralFirstAttack.rngDodgeRoll!, 12)
    expect(favoredFirstAttack.wasDodged).toBe(false)
    expect(neutralFirstAttack.wasDodged).toBe(false)
    expect(favoredFirstAttack.rngAdjustedRoll).toBeGreaterThan(neutralFirstAttack.rngAdjustedRoll!)
    expect(favoredFirstAttack.amount).toBeGreaterThan(neutralFirstAttack.amount)

    neutral = TEST_ACTIONS.endTurn(neutral)
    favored = TEST_ACTIONS.endTurn(favored)

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    favored = TEST_ACTIONS.basicAttack(favored, TEST_QUERIES.getOpponentHero(favored))

    const neutralSecondAttack = lastDamageEvent(neutral)
    const favoredSecondAttack = lastDamageEvent(favored)

    expect(favoredSecondAttack.rngRawRoll).toBeCloseTo(neutralSecondAttack.rngRawRoll!, 12)
    expect(favoredSecondAttack.rngDodgeRoll).toBeCloseTo(neutralSecondAttack.rngDodgeRoll!, 12)
    expect(favoredSecondAttack.wasDodged).toBe(false)
    expect(neutralSecondAttack.wasDodged).toBe(false)
    expect(favoredSecondAttack.rngAdjustedRoll).toBeLessThan(neutralSecondAttack.rngAdjustedRoll!)
  })
})

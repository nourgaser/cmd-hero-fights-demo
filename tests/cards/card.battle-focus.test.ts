import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.battle-focus', () => {
  it('adds bonus damage to the next attack, then consumes the bonus', () => {
    let neutral = TEST_SIM.createSim({
      seed: 'battlefocus',
      deck: [],
      opponentDeck: [],
      openingHandSize: 0,
      openingMovePoints: 6,
    })
    let buffed = TEST_SIM.createSim({
      seed: 'battlefocus',
      deck: [CARD_IDS.battleFocus],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const buffedHeroId = TEST_QUERIES.getActiveHero(buffed)
    buffed = TEST_ACTIONS.playCard(buffed, CARD_IDS.battleFocus)

    expect(
      TEST_QUERIES.getEntityPreview(buffed, buffedHeroId).combatNumbers.attackFlatBonusDamage.effective,
    ).toBe(6)
    expect(
      buffed.session.state.activeListeners.some((listener) =>
        listener.listenerId.startsWith('listener.battle-focus.consume:'),
      ),
    ).toBe(true)

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    buffed = TEST_ACTIONS.basicAttack(buffed, TEST_QUERIES.getOpponentHero(buffed))

    const neutralDamage = TEST_QUERIES.eventsOfKind(neutral.lastEvents, 'damageApplied')[0]
    const buffedDamage = TEST_QUERIES.eventsOfKind(buffed.lastEvents, 'damageApplied')[0]

    expect(neutralDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.rngRawRoll).toBeCloseTo(neutralDamage?.rngRawRoll ?? 0, 12)
    expect(buffedDamage?.amount).toBe((neutralDamage?.amount ?? 0) + 6)

    expect(
      TEST_QUERIES.getEntityPreview(buffed, buffedHeroId).combatNumbers.attackFlatBonusDamage.effective,
    ).toBe(0)
    expect(
      buffed.session.state.activeListeners.some((listener) =>
        listener.listenerId.startsWith('listener.battle-focus.consume:'),
      ),
    ).toBe(false)
    TEST_ASSERTIONS.expectEventsOfKind(buffed.lastEvents, 'numberModifierExpired').toHaveLength(1)
  })
})

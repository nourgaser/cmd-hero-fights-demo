import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.war-standard', () => {
  it('summons War Standard and increases the hero attack buff while it remains', () => {
    let neutral = TEST_SIM.createSim({
      seed: 'warstandard-1',
      deck: [],
      opponentDeck: [],
      openingHandSize: 0,
      openingMovePoints: 10,
    })
    let buffed = TEST_SIM.createSim({
      seed: 'warstandard-1',
      deck: [CARD_IDS.warStandard],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const buffedHeroId = TEST_QUERIES.getActiveHero(buffed)

    buffed = TEST_ACTIONS.playCard(buffed, CARD_IDS.warStandard)

    const summon = TEST_QUERIES.findEntityByCard(buffed, CARD_IDS.warStandard)
    expect(summon.kind).toBe('totem')
    expect(summon.currentHealth).toBe(10)
    expect(TEST_QUERIES.getEntityPreview(buffed, buffedHeroId).attackDamage).toBe(6)

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    buffed = TEST_ACTIONS.basicAttack(buffed, TEST_QUERIES.getOpponentHero(buffed))

    const neutralDamage = TEST_QUERIES.eventsOfKind(neutral.lastEvents, 'damageApplied')[0]
    const buffedDamage = TEST_QUERIES.eventsOfKind(buffed.lastEvents, 'damageApplied')[0]

    expect(neutralDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.wasDodged).toBe(false)
    expect(buffedDamage?.amount).toBe((neutralDamage?.amount ?? 0) + 1)
  })
})

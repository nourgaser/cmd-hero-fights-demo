import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.steelbound-effigy', () => {
  it('summons Steelbound Effigy and gives it armor equal to the hero attack damage', () => {
    let sim = TEST_SIM.createSim({
      seed: 'steelbound-1',
      deck: [CARD_IDS.steelboundEffigy],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const heroAttackDamage = TEST_QUERIES.getEntityPreview(sim, heroId).combatNumbers.attackDamage.effective

    // Place the summon away from the hero so only the card's own armor rule is under test.
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.steelboundEffigy, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.steelboundEffigy)
    const summonPreview = TEST_QUERIES.getEntityPreview(sim, summon.entityId)

    expect(summon.kind).toBe('totem')
    expect(summonPreview.isTaunt).toBe(true)
    expect(summonPreview.currentHealth).toBe(15)
    expect(summonPreview.magicResist).toBe(1)
    expect(summonPreview.armor).toBe(heroAttackDamage)
  })
})

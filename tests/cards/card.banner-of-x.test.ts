import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.banner-of-x', () => {
  it('summons Banner of X and gives the hero +1 move capacity while it remains', () => {
    let neutral = TEST_SIM.createSim({
      seed: 'banner-base',
      deck: [],
      opponentDeck: [],
      openingHandSize: 0,
      openingMovePoints: 10,
    })
    let buffed = TEST_SIM.createSim({
      seed: 'banner-base',
      deck: [CARD_IDS.bannerOfX],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const heroId = TEST_QUERIES.getActiveHero(buffed)

    buffed = TEST_ACTIONS.playCard(buffed, CARD_IDS.bannerOfX)

    const summon = TEST_QUERIES.findEntityByCard(buffed, CARD_IDS.bannerOfX)
    expect(summon.kind).toBe('totem')
    expect(
      buffed.preview.heroHandCounts.find((entry) => entry.heroEntityId === heroId)?.moveCapacityTrace
        .effective,
    ).toBe(11)

    neutral = TEST_ACTIONS.endTurn(neutral)
    neutral = TEST_ACTIONS.endTurn(neutral)
    buffed = TEST_ACTIONS.endTurn(buffed)
    buffed = TEST_ACTIONS.endTurn(buffed)

    expect(TEST_QUERIES.getEntityPreview(buffed, heroId).movePoints).toBe(
      TEST_QUERIES.getEntityPreview(neutral, TEST_QUERIES.getActiveHero(neutral)).movePoints + 1,
    )
    expect(TEST_QUERIES.getEntityPreview(buffed, heroId).combatNumbers.moveCapacity.effective).toBe(
      TEST_QUERIES.getEntityPreview(neutral, TEST_QUERIES.getActiveHero(neutral)).combatNumbers
        .moveCapacity.effective + 1,
    )
  })
})

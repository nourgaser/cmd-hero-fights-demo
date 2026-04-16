# Content Testing Framework

## Goal

Keep the test suite:

- engine-level only
- deterministic
- small
- explicit
- cheap to maintain

This repo already has the two base pieces we should build on:

- `tests/replay-determinism.test.ts`
- `tests/simulation-test-utils.ts`
- `tests/cards/content-test-coverage.test.ts`

Everything else should be small "unit tests" around a single gameplay promise.

## Scope

The suite should cover four buckets:

1. cards
2. summons
3. reusable effect kinds
4. shared mechanics

Important: one test may cover more than one bucket.

Important: for summon content, the default is one combined test.

- test the summon card by playing it
- assert the entity was created
- assert the summoned entity's defining behavior

In other words: do not write one test for "the card summons the entity" and another separate test for "the entity works" unless there is a clear reason. In most cases that split is unnecessary and should be avoided.

Example:

- `card.guard-sigil.test.ts` can count as:
  - card coverage for `Guard Sigil`
  - summon coverage for the `Guard Sigil` totem
  - effect coverage for `summonEntity`
  - effect coverage for `modifyStat`
  - mechanic coverage for `untilSourceRemoved`

That is the default approach. We should only split coverage into separate files when combining them would make the test muddy or hard to reason about.

## File Layout

Keep replay coverage separate and keep all small unit tests together.

- `tests/replay-determinism.test.ts`
- `tests/simulation-test-utils.ts`
- `tests/cards/content-test-coverage.test.ts`
- `tests/cards/card.<slug>.test.ts`
- `tests/cards/mechanic.<slug>.test.ts`
- `tests/cards/effect.<slug>.test.ts` only when card coverage is not the clearest shared proof
- `tests/cards/helpers/` only if a helper is reused by at least 3 tests

Recommended naming:

- `card.iron-skin.test.ts`
- `card.merewen-the-shieldmaiden.test.ts`
- `mechanic.luck.test.ts`
- `mechanic.commander-x-passive.test.ts`

Each file should usually contain:

- one `describe(...)`
- one `it(...)`

If a file needs a second `it(...)`, that is usually a sign the test should be split or simplified.

## Test Rules

### What a good test looks like

- fixed seed
- tiny deck
- enough move points to execute the scenario
- 2 to 5 actions total
- one clear expectation
- direct state assertions
- event assertions only when they clarify the mechanic

### What to avoid

- synergy tests
- long turn sequences
- UI tests
- snapshots of full state
- brittle assertions on unrelated numbers

### Assertion order

Prefer this order:

1. assert the relevant before-state
2. perform the action
3. assert the direct state change
4. assert 1 event only if it proves the contract more clearly

### Randomness rule

If the mechanic depends on RNG, compare two simulations with the same seed:

- one neutral
- one with the mechanic applied

That proves the mechanic changed the outcome, instead of proving that a random roll happened.

## Standard Test Workflow For New Content

When adding a new card, summon, effect, or mechanic:

1. Add or update the runtime content in `game/content/`.
2. Identify whether the content only uses existing effect kinds or needs a new effect/mechanic.
3. If a new effect/mechanic is needed, implement it minimally in the engine.
4. Add the smallest unit test that proves the content's core promise.
5. If the content summons an entity, the same test should usually prove the summoned entity's defining behavior too.
6. If the content introduces a new shared mechanic, add one dedicated mechanic test.
7. Run the targeted unit test.
8. Run `tests/replay-determinism.test.ts` if the change touches RNG, listeners, action resolution, replay state, summons, or effect execution.

## How To Write Each Test Type

### Card test

A card test should prove:

- the card is playable in a minimal setup
- the card performs its direct promise
- any required targeting or cast condition works

For summon cards, "the card performs its direct promise" usually means:

- the entity is summoned
- the entity's core on-board behavior is proven in the same test

Default shape:

1. create a sim with a tiny deck containing the card
2. make sure move points are high enough
3. play the card
4. assert the one important outcome

Use a negative assertion only when the card's core rule is a restriction.

Examples:

- `Chaaarge!` should prove the cast condition blocks play above the HP threshold
- `Reset Luck` should prove the balance returns to neutral

### Summon test

A summon test should prove the summoned entity's defining contract, not every possible interaction.

Most of the time, this should not be a standalone file. It should be the same file as the summoning card test.

Create a separate summon-focused test only when the combined test would become harder to read than the behavior is worth.

Default shape:

1. play the summon card
2. find the entity with `findEntityByCard`
3. assert the entity exists
4. assert the defining property
5. if it has an active, use it once
6. if it has a passive, assert the passive works as expected

If battlefield placement matters, choose it explicitly.
Example: place a summon away from the hero when you want to test the card's own stat buff without unrelated adjacency contributions.

Defining property examples:

- aura or stat bonus while present
- retaliate listener
- active attack exists and resolves
- heavy refresh cadence
- "max damage equals current HP"
- adjacency-based effect affects adjacent entities as expected

### Effect test

An effect test is only needed as a standalone file when the card test is not the cleanest proof of a reusable shared contract.

Use effect-level tests for:

- new effect kinds
- generic engine behaviors reused by many cards
- bugs where the shared effect handler needs a permanent regression test

If an existing card test is already the cleanest proof, let that card test be the canonical effect coverage.

### Mechanic test

A mechanic test covers rules that are bigger than one card:

- luck
- hero passive behavior
- cast conditions
- aura timing
- sharpness
- summon refresh cadence
- battlefield mechanics like adjacency

Mechanic tests should still stay small. They are not integration scenarios.

## Using `simulation-test-utils.ts`

This file is the standard public test API. Prefer importing from it instead of reaching into app or engine internals from every test.

Current shape:

- `TEST_SIM`
- `TEST_ACTIONS`
- `TEST_QUERIES`
- `TEST_ASSERTIONS`
- `CARD_IDS`
- `HERO_IDS`
- `STARTER_DECKS`
- `DEFAULT_GAME_BOOTSTRAP_CONFIG`
- `SUMMON_ENTITY_IDS`

Common members:

- `TEST_SIM.createSim(...)`
- `TEST_ACTIONS.playCard(...)`
- `TEST_ACTIONS.basicAttack(...)`
- `TEST_ACTIONS.useEntityActive(...)`
- `TEST_ACTIONS.endTurn(...)`
- `TEST_ACTIONS.pressLuck(...)`
- `TEST_QUERIES.getEntity(...)`
- `TEST_QUERIES.getEntityPreview(...)`
- `TEST_QUERIES.findEntityByCard(...)`
- `TEST_QUERIES.findEntitiesByCard(...)`
- `TEST_QUERIES.getActiveHero(...)`
- `TEST_QUERIES.getOpponentHero(...)`
- `TEST_QUERIES.getHandCardIds(...)`
- `TEST_ASSERTIONS.expectHandSize(...)`
- `TEST_ASSERTIONS.eventsOfKind(...)`
- `TEST_ASSERTIONS.expectEventsOfKind(...)`

Use `eventsOfKind(...)` when you want the filtered array.
Use `expectEventsOfKind(...)` when you want an assertion chain such as `.toHaveLength(...)`.

Useful patterns:

- use `openingHandSize: 1` or `2`
- pass a one-card deck when the scenario only needs one card
- raise `openingMovePoints` when the card cost is high
- use `expectFailure: true` only for rule-gate tests

## Recommended Test Pattern

```ts
import { describe, expect, it } from 'vitest'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.iron-skin', () => {
  it('gives the active hero 1 armor', () => {
    let sim = TEST_SIM.createSim({
      seed: 'iron-skin',
      deck: [CARD_IDS.ironSkin],
      opponentDeck: [CARD_IDS.ironSkin],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeArmor = TEST_QUERIES.getEntityPreview(sim, heroId).armor

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.ironSkin)

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(beforeArmor + 1)
  })
})
```

## Summon Pattern

```ts
import { describe, expect, it } from 'vitest'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.corroded-shortsword', () => {
  it('summons the weapon and lets it attack once', () => {
    let sim = TEST_SIM.createSim({
      seed: 'corroded-shortsword',
      deck: [CARD_IDS.corrodedShortsword],
      opponentDeck: [CARD_IDS.corrodedShortsword],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.corrodedShortsword)
    const weapon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.corrodedShortsword)

    expect(weapon.currentHealth).toBeGreaterThan(0)

    sim = TEST_ACTIONS.useEntityActive(
      sim,
      weapon.entityId,
      TEST_QUERIES.getOpponentHero(sim),
    )

    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    expect(damageEvent).toBeDefined()
  })
})
```

## RNG Pattern

```ts
import { describe, expect, it } from 'vitest'
import {
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('mechanic.luck', () => {
  it('pressLuck shifts the next roll in favor of the active player', () => {
    let neutral = TEST_SIM.createSim({ seed: 'luck-basic', openingHandSize: 0, openingMovePoints: 6 })
    let favored = TEST_SIM.createSim({ seed: 'luck-basic', openingHandSize: 0, openingMovePoints: 6 })

    favored = TEST_ACTIONS.pressLuck(favored)
    expect(favored.session.state.luck.balance).toBeGreaterThan(neutral.session.state.luck.balance)

    neutral = TEST_ACTIONS.basicAttack(neutral, TEST_QUERIES.getOpponentHero(neutral))
    favored = TEST_ACTIONS.basicAttack(favored, TEST_QUERIES.getOpponentHero(favored))

    const neutralDamage = TEST_QUERIES.eventsOfKind(neutral.lastEvents, 'damageApplied')[0]
    const favoredDamage = TEST_QUERIES.eventsOfKind(favored.lastEvents, 'damageApplied')[0]

    expect(favoredDamage?.amount).toBeGreaterThanOrEqual(neutralDamage?.amount ?? 0)
  })
})
```

## Coverage Guard

`tests/cards/content-test-coverage.test.ts` is the suite-level guard for runtime content coverage.

Rules:

- cards in `game/content/**/cards/*.ts` should have a matching `tests/cards/card.<slug>.test.ts`
- summon files should usually be covered by that same card test
- summon-only test files should be rare and only used when the combined test would be unclear
- hero passive content should have a matching mechanic test

Expected workflow:

1. add or change runtime content
2. add or update the matching test
3. run the targeted test
4. keep the coverage guard green

## Canonical Shared Coverage

These are the shared contracts we already have in the engine. The first listed test should be the canonical proof for that behavior.

### Effect-kind coverage map

- `summonEntity`: `card.corroded-shortsword.test.ts`
- `modifyStat`: `card.iron-skin.test.ts`
- `drawCards`: `card.reroll.test.ts`
- `heal`: `card.health-potion.test.ts`
- `grantHealth`: `card.bulwark-of-fortune.test.ts`
- `reflectDamage`: `card.merewen-the-shieldmaiden.test.ts`
- `dealDamage`: `card.shield-toss.test.ts`
- `destroyArmorAndDealPerArmorToEnemyHero`: `card.warcry.test.ts`
- `destroySelfArmorAndDealPerArmorToTarget`: `card.shatter-plating.test.ts`
- `resetLuckBalance`: `card.reset-luck.test.ts`
- `refundMoveCost`: `card.chaaarge.test.ts`
- `applyAura`: `card.reactive-bulwark.test.ts`
- `addListener`: `card.battle-focus.test.ts`
- `removeListener`: currently unused by runtime content, so no test yet

### Mechanic coverage map

- luck action and luck bias: `mechanic.luck.test.ts`
- Commander X passive heal-on-attack: `mechanic.commander-x-passive.test.ts`
- `heroHealthBelow` cast condition: `card.chaaarge.test.ts`
- start-of-next-turn expiry: `card.bastion-stance.test.ts`
- until-source-removed modifiers: `card.guard-sigil.test.ts`
- periodic turn listener cadence: `card.evergrowth-idol.test.ts`
- active summon attack resolution: `card.corroded-shortsword.test.ts`
- adjacency-based ally effects: `card.merewen-the-shieldmaiden.test.ts`
- retaliatory damage listener: `card.riquier-the-bear.test.ts`
- aura application and expiry: `card.reactive-bulwark.test.ts`
- sharpness removing resistance: `card.veteran-edge.test.ts`

## PR Rule For Future Content

No new gameplay content should land without the smallest matching unit coverage:

- new card: add or update a card test
- new summon: extend the summoning card test; add a separate summon-focused test only if the combined test would be unclear
- new reusable effect kind: add canonical effect coverage
- new shared mechanic: add a mechanic test
- new randomness: confirm replay determinism still passes

If a change cannot be explained by one short test sentence, the design is probably too large for this prototype and should be simplified before implementation.

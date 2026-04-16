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

Available helpers:

- `createSim(...)`
- `playCard(...)`
- `basicAttack(...)`
- `useEntityActive(...)`
- `endTurn(...)`
- `pressLuck(...)`
- `getEntity(...)`
- `getEntityPreview(...)`
- `findEntityByCard(...)`
- `findEntitiesByCard(...)`
- `getActiveHero(...)`
- `CARD_IDS`
- `HERO_IDS`
- `STARTER_DECKS`
- `DEFAULT_GAME_BOOTSTRAP_CONFIG`
- `SUMMON_ENTITY_IDS`

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
  createSim,
  getActiveHero,
  getEntity,
  playCard,
} from '../simulation-test-utils'

describe('card.iron-skin', () => {
  it('gives the active hero 1 armor', () => {
    let sim = createSim({
      seed: 'iron-skin',
      deck: [CARD_IDS.ironSkin],
      opponentDeck: [CARD_IDS.ironSkin],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = getActiveHero(sim)
    const before = getEntity(sim, heroId)

    sim = playCard(sim, CARD_IDS.ironSkin)

    const after = getEntity(sim, heroId)
    expect(after.armor).toBe(before.armor + 1)
  })
})
```

## Summon Pattern

```ts
import { describe, expect, it } from 'vitest'
import {
  CARD_IDS,
  createSim,
  findEntityByCard,
  playCard,
  useEntityActive,
} from '../simulation-test-utils'

function getEnemyHeroId(sim: ReturnType<typeof createSim>): string {
  const activeHeroId = sim.preview.activeHeroEntityId
  const [heroA, heroB] = sim.session.state.heroEntityIds
  return activeHeroId === heroA ? heroB : heroA
}

describe('card.corroded-shortsword', () => {
  it('summons the weapon and lets it attack once', () => {
    let sim = createSim({
      seed: 'corroded-shortsword',
      deck: [CARD_IDS.corrodedShortsword],
      opponentDeck: [CARD_IDS.corrodedShortsword],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    sim = playCard(sim, CARD_IDS.corrodedShortsword)
    const weapon = findEntityByCard(sim, CARD_IDS.corrodedShortsword)

    expect(weapon.currentHealth).toBeGreaterThan(0)

    sim = useEntityActive(sim, weapon.entityId, getEnemyHeroId(sim))

    const damageEvent = sim.lastEvents.find((event) => event.kind === 'damageApplied')
    expect(damageEvent).toBeDefined()
  })
})
```

## RNG Pattern

```ts
import { describe, expect, it } from 'vitest'
import {
  basicAttack,
  createSim,
  getActiveHero,
  pressLuck,
} from '../simulation-test-utils'

function getEnemyHeroId(sim: ReturnType<typeof createSim>): string {
  const activeHeroId = getActiveHero(sim)
  const [heroA, heroB] = sim.session.state.heroEntityIds
  return activeHeroId === heroA ? heroB : heroA
}

function getLastDamage(sim: ReturnType<typeof createSim>): number {
  const event = sim.lastEvents.find((entry) => entry.kind === 'damageApplied')
  if (!event || event.kind !== 'damageApplied') {
    throw new Error('Expected a damageApplied event')
  }
  return event.amount
}

describe('mechanic.luck', () => {
  it('pressLuck shifts the next roll in favor of the active player', () => {
    let neutral = createSim({ seed: 'luck-basic', openingHandSize: 0, openingMovePoints: 6 })
    let favored = createSim({ seed: 'luck-basic', openingHandSize: 0, openingMovePoints: 6 })

    favored = pressLuck(favored)
    expect(favored.session.state.luck.balance).toBeGreaterThan(neutral.session.state.luck.balance)

    neutral = basicAttack(neutral, getEnemyHeroId(neutral))
    favored = basicAttack(favored, getEnemyHeroId(favored))

    expect(getLastDamage(favored)).toBeGreaterThanOrEqual(getLastDamage(neutral))
  })
})
```

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

## Rollout Plan For Existing Content

Current runtime Commander X content surface:

- 29 cards
- 15 summons
- 1 hero passive
- 13 used effect kinds
- 1 replay determinism suite

### Phase 1: foundation

- [ ] `mechanic.luck.test.ts`
- [ ] `mechanic.commander-x-passive.test.ts`
- [ ] `card.reset-luck.test.ts`
- [ ] `card.reroll.test.ts`
- [ ] `card.iron-skin.test.ts`
- [ ] `card.health-potion.test.ts`

### Phase 2: timed and persistent modifiers

- [ ] `card.hunker-down.test.ts`
- [ ] `card.bastion-stance.test.ts`
- [ ] `card.battle-focus.test.ts`
- [ ] `card.veteran-edge.test.ts`
- [ ] `card.war-standard.test.ts`
- [ ] `card.guard-sigil.test.ts`
- [ ] `card.banner-of-x.test.ts`
- [ ] `card.healing-fortress.test.ts`
- [ ] `card.steelbound-effigy.test.ts`

### Phase 3: targeted combat rules

- [ ] `card.shield-toss.test.ts`
- [ ] `card.warcry.test.ts`
- [ ] `card.shatter-plating.test.ts`
- [ ] `card.chaaarge.test.ts`
- [ ] `card.medal-of-honor.test.ts`
- [ ] `card.reactive-bulwark.test.ts`

### Phase 4: summon cards and on-board behaviors

- [ ] `card.corroded-shortsword.test.ts`
- [ ] `card.defiled-greatsword.test.ts`
- [ ] `card.glinting-adamantite-blade.test.ts`
- [ ] `card.shamanic-titanium-pummeler.test.ts`
- [ ] `card.common-expendable-deadly-man.test.ts`
- [ ] `card.jaquemin-patrol.test.ts`
- [ ] `card.merewen-the-shieldmaiden.test.ts`
- [ ] `card.riquier-the-bear.test.ts`
- [ ] `card.evergrowth-idol.test.ts`
- [ ] `card.bulwark-of-fortune.test.ts`

Note: several cards in phases 2 and 4 intentionally overlap. That is correct. The normal expectation is one test per summon card that also covers the summoned entity's defining behavior.

Effect-kind coverage should piggyback on those canonical tests instead of creating extra bookkeeping files unless a shared handler needs its own regression test.

## Existing Card Checklist

This is the card-by-card expectation list. Each test should only prove the sentence on its row.

- [ ] `Reroll`: playing it draws exactly 1 replacement card.
- [ ] `Hunker Down`: grants dodge this turn and the bonus disappears on your next turn.
- [ ] `Reset Luck`: returns luck balance to neutral.
- [ ] `Iron Skin`: grants 1 armor immediately.
- [ ] `Health Potion`: heals the hero.
- [ ] `Bastion Stance`: grants armor and magic resist until next turn only.
- [ ] `Battle Focus`: the next attack gets bonus damage once, then the bonus is consumed.
- [ ] `Medal of Honor`: buffs the selected allied companion and grants temporary immune.
- [ ] `Shatter Plating`: converts your current armor into damage against the target.
- [ ] `Shield Toss`: deals damage that scales with armor.
- [ ] `Warcry`: destroys your armor and deals matching damage to the enemy hero.
- [ ] `Chaaarge!`: is only playable below the HP threshold and refunds move cost when the hit is not dodged.
- [ ] `Corroded Shortsword`: summons the weapon and it can attack once.
- [ ] `Defiled Greatsword`: summons the weapon and it can attack once.
- [ ] `Glinting Adamantite Blade`: summons the weapon and its max damage tracks current HP.
- [ ] `Shamanic Titanium Pummeler`: summons the heavy weapon and its attack uses sharpness.
- [ ] `War Standard`: summons the totem and the hero gains attack damage while it remains.
- [ ] `Guard Sigil`: summons the totem and the hero gains armor and magic resist while it remains.
- [ ] `Healing Fortress`: summons the totem and attacks heal more while it remains.
- [ ] `Evergrowth Idol`: summons the totem and its periodic growth triggers on schedule.
- [ ] `Banner of X`: summons the totem and allies gain move capacity while it remains.
- [ ] `Jaquemin the Patrol`: summons the companion and it follows up when the hero attacks.
- [ ] `Reactive Bulwark`: applies the aura and the resistance bonus appears after damage is taken.
- [ ] `Steelbound Effigy`: summons the totem and its armor equals hero attack damage.
- [ ] `Bulwark of Fortune`: summons the totem and being attacked grants health to a random ally.
- [ ] `A Common, Expendable, but Deadly Man`: summons the companion and it can use its active once.
- [ ] `Merewen the Shieldmaiden`: summons the companion, adjacent allies are buffed/healed, and the next attack is reflected.
- [ ] `Riquier the Bear`: summons the companion and it retaliates when attacked.
- [ ] `Veteran Edge`: permanently grants bonus basic-attack damage and sharpness.

## Existing Summon Checklist

These should usually be covered by the card test that summons them. Separate summon-only tests are the exception, not the default.

- [ ] `Corroded Shortsword`
- [ ] `Defiled Greatsword`
- [ ] `Glinting Adamantite Blade`
- [ ] `Shamanic Titanium Pummeler`
- [ ] `War Standard`
- [ ] `Guard Sigil`
- [ ] `Healing Fortress`
- [ ] `Evergrowth Idol`
- [ ] `Banner of X`
- [ ] `Steelbound Effigy`
- [ ] `Bulwark of Fortune`
- [ ] `Jaquemin the Patrol`
- [ ] `A Common, Expendable, but Deadly Man`
- [ ] `Merewen the Shieldmaiden`
- [ ] `Riquier the Bear`

## PR Rule For Future Content

No new gameplay content should land without the smallest matching unit coverage:

- new card: add or update a card test
- new summon: extend the summoning card test; add a separate summon-focused test only if the combined test would be unclear
- new reusable effect kind: add canonical effect coverage
- new shared mechanic: add a mechanic test
- new randomness: confirm replay determinism still passes

If a change cannot be explained by one short test sentence, the design is probably too large for this prototype and should be simplified before implementation.

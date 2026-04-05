# MVP Scope Checklist (Commander X)

This checklist is the implementation gate for MVP work.

## Included Now

- [x] Hero: Commander X
- [x] General ability: Reroll
- [x] Commander X abilities: Iron Skin, Health Potion, Bastion Stance, Battle Focus, Shield Toss, Chaaarge!
- [x] Weapon: Corroded Shortsword
- [x] Totems: War Standard, Guard Sigil
- [x] Companion: Jaquemin the Patrol

## Excluded For Now

- [x] All low-priority cards listed in prototype-content.md
- [x] Any hero other than Commander X
- [x] Any system not needed by included cards

## Hard Constraints

- [x] No tests
- [x] No logging or debug systems
- [x] No content compilation pipeline
- [x] No dependency on reference content/ markdown parsing
- [x] Engine is action-driven and UI-agnostic
- [x] Deterministic seeded RNG only

## First Build Order

- [x] Shared models, one file at a time with review
- [x] Engine deterministic core
- [x] Battlefield helpers
- [x] Action resolution pipeline
- [x] Effect implementations needed by included cards
- [x] Runtime content for included cards
- [x] Minimal app integration

## Minimal App Integration Plan

- [x] Frontend stack bootstrap (Vite + React + TypeScript)
- [x] Icon stack bootstrap (`@iconify-json/game-icons`, optional renderer package during app phase)
- [x] App imports only public game API entry (`game/index.ts`)
- [x] Split-screen layout (Player A / Player B)
- [x] Battle bootstrap UI (seed + start/reset)
- [x] Battlefield occupancy view with procedural visuals
- [x] Card/entity icon mapping via `game-icons:*` ids and visual metadata policy
- [x] Hand and card play controls (with targeting)
- [x] Non-card action controls (basic attack, entity active, press luck, end turn)

## Number Modifier Rehaul Plan

Goal: move from direct mutable numeric edits to derived, traceable effective numbers powered by persistent modifiers and support all gameplay-resolved numbers: entity stats, effect payload values (damage ranges, draw counts, heal ranges, refunds), and core action constants (basic attack ranges, luck deltas).

### Phase 1: Shared Model Foundation + Keyword Architecture

- [x] Add immutable base values to runtime entities and effect payloads (hero/summon stats, action constants)
- [x] Add active number modifier model (id, source metadata, target binding, operation, value, lifetime, condition)
- [x] Add selector-driven passive rule model (source binding + target selector + numeric operations + active condition)
- [x] Add number explanation row model for UI traceability (base, source-tagged contributions, effective)
- [x] Document and enforce deterministic number resolution order in code
- [x] Add explicit keyword-effect mapping only for cards that literally state a keyword in their text
- [x] Do not treat keywords as generic tags or placeholder labels

### Phase 2: Central Resolver Contract

- [x] Add engine number resolver module to compute effective numbers from base + active modifiers + passive rules
- [x] Extend resolver to cover entity stats, effect payload numbers (damage/heal ranges, draw counts, refunds), and action constants
- [x] Add resolver outputs for explanation breakdown per number (source-tagged contribution rows)
- [x] Add helper APIs for effective number reads in engine paths (combat, scaling, resistances, previews, card play)

### Phase 3: Lifecycle Integration + Keyword Linkage

- [x] Initialize modifier/rule collections in battle creation
- [x] Initialize modifier/rule collections on summoned entities
- [x] Add source cleanup on entity removal (remove/disable source-emitted rules and linked modifiers)
- [x] Extend battle events with number-modifier applied/updated/expired events for deterministic traceability
- [x] Keep room for explicit keyword-effect definitions in content, but only when a card text actually uses one

### Phase 4: Hard Switch Effect/Action Migration

- [x] Replace direct numeric mutation in stat handlers (gain/lose armor, MR, AD) with modifier operations
- [x] Migrate effect payload number handlers (damage/heal, draw count, refunds) to resolver-adjusted reads
- [x] Migrate action-level constants (basic attack ranges, luck deltas, press-luck bounds) to resolver-adjusted reads
- [x] Implement condition-based numeric adjustments (e.g., `modifyAttackDamageWhileSourcePresent`) using passive rules
- [x] Refactor temporary buff patterns from inverse rollback effects to lifetime/condition-based modifiers
- [x] Remove obsolete direct-mutation effect payloads/handlers after migration

### Phase 5: Full UX Traceability

- [x] Extend app preview data with number base/effective/delta and explanation rows for stats and card/action numbers
- [x] Battlefield hover: color numeric stats by delta vs base (up/down/neutral)
- [x] Shift-hover: show per-number detailed contribution lines grouped by source
- [x] Ensure hero/summon tooltips and active previews consistently use effective numbers

### Phase 6: Commander X Content + Keyword Modeling

- [ ] If a selected Commander X card explicitly uses a keyword in text, model that keyword 1:1 with its effect
- [x] Update cards relying on direct numeric mutations to passive rule / modifier semantics
- [x] Keep effect modeling declarative: passive rules + conditions + expirations, not one-off direct edits

Phase 6 notes:
- Unified stat-changing effects under generic `modifyStat` payload (`stat`, `amount`, `duration`, `sourceBinding`) to remove duplicated effect kinds/handlers.
- Migrated `War Standard` and `Guard Sigil` to `modifyStat` with `duration: untilSourceRemoved` bound to `lastSummonedEntity`.
- Migrated persistent and temporary stat cards (`Iron Skin`, `Battle Focus`, `Bastion Stance`) to `modifyStat` with explicit positive/negative deltas.

### Phase 7: Manual Acceptance Pass (No Tests)

- [ ] Fixed-seed scenario: passive rule source present before ally summon still affects newly summoned ally
- [ ] Fixed-seed scenario: removing passive source removes contributions from all valid targets
- [x] Fixed-seed scenario: stacked positive/negative modifiers resolve deterministically and display correctly
- [x] Fixed-seed scenario: temporary modifier expiration updates effective numbers without direct rollback mutation
- [ ] Fixed-seed scenario: keyword metadata is available and correctly linked in tooltips, previews, and debug surfaces
- [ ] Verify all gameplay number changes are driven by modifier/rule records and resolver output

Validation notes:
- `/tmp/cmd_validate_phase4.ts` run with fixed seed `validation-seed-1` produced identical end-state digest across repeated runs.
- Scenario confirmed `numberModifierApplied` and `numberModifierExpired` events and showed temporary buff removal without direct base-stat rollback.


## Next UI/Product Tasks

### Summon Preview Tooltip

- [x] Add side tooltip for summon cards showing summoned entity preview before play
- [x] Match existing card tooltip framing (header, type, rarity) for summon preview panel
- [x] Show summon preview combat/vitals stats and relevant active/passive summary text
- [x] Wire preview data from runtime content definitions (no markdown/reference-content parsing)

### Action/Toast History

- [ ] Persist a history list of engine result messages in app state (ordered timeline)
- [ ] Capture action metadata per entry (turn number, actor, action kind, result text, success/failure)
- [ ] Add "History" button to open a modal timeline view
- [ ] Modal UX: dismiss with close button, outside click, and Escape key
- [ ] Ensure history panel styling follows current game theme and remains readable on mobile

### Replayable Snapshot Debugger

- [ ] Add timeline snapshots in app state after each resolved action (state, action input, produced events, nextSequence)
- [ ] Include pre-action and post-action snapshots to inspect invalid actions and successful transitions
- [ ] Add snapshot list UI controls (jump to snapshot, step backward, step forward, jump to latest)
- [ ] Add clear snapshot labels (turn, actor, action kind, short result summary)
- [ ] Add branch-from-snapshot flow so we can continue gameplay from any prior snapshot for what-if debugging
- [ ] Add deterministic RNG checkpoint metadata per snapshot (seed + rng cursor/step count)
- [ ] Add engine RNG restore/advance utility so loading a snapshot resumes with the same future roll sequence
- [ ] Validate replay determinism by rebuilding from seed + action log and comparing snapshot events/state
- [ ] Add quick copy/export for action log plus snapshot metadata for bug reports and repro sharing

### Unified Extensible Game Debugger

- [ ] Rename current debugger surface to `Game Debugger` and route all debug tools through one entry point
- [ ] Define debugger module structure by feature section (battle state, events, action history, snapshots, RNG, inspector)
- [ ] Add collapsible sections with independent open/closed state persistence
- [ ] Add global "collapse all / expand all" controls for fast navigation
- [ ] Add fully minimized mode that collapses debugger into a very small docked chip/button
- [ ] Add quick restore from minimized mode while preserving current tab/section state
- [ ] Add compact and full layout modes (compact for gameplay, full for deep debugging)
- [ ] Persist debugger UI preferences in local storage (position, size, collapsed sections, minimized state)
- [ ] Add keyboard shortcuts for open/close, minimize, and section navigation
- [ ] Add extensibility contract for new debugger sections (shared section API + registration pattern)
- [ ] Ensure debugger can be safely extended without changing engine architecture (UI-only composition over game API)
- [ ] Keep debugger read-only against engine state except explicit debug actions (jump to snapshot, branch, replay)
- [ ] Add visual polish pass for readability (spacing, hierarchy, sticky controls, scroll behavior)
- [ ] Ensure responsive behavior: usable on mobile and narrow desktop widths


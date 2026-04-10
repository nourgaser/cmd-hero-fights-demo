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

### Scalability / Maintainability Risks

- [ ] Replace manual hero/card lookup wiring with a single content registry path that covers definitions, initial listeners, summon blueprints, summon footprints, and active profiles.
- [ ] Replace manual effect-handler dispatch with a registry that is generated or assembled from the same effect source of truth as the schema.
- [ ] Remove duplicated listener-condition matching between schema/model definitions and runtime matching logic.
- [ ] Reduce action/effect/targeting switch fan-out so new kinds do not require patching multiple unrelated files.
- [ ] Consolidate card bootstrap metadata, icon metadata, and starter deck wiring so adding a new card or hero touches one obvious content surface.
- [ ] Split or simplify the largest app-facing preview file if it keeps accumulating formatting, tooltip, summon-preview, and cast-condition logic in one place.

### Summon Preview Tooltip

- [x] Add side tooltip for summon cards showing summoned entity preview before play
- [x] Match existing card tooltip framing (header, type, rarity) for summon preview panel
- [x] Show summon preview combat/vitals stats and relevant active/passive summary text
- [x] Wire preview data from runtime content definitions (no markdown/reference-content parsing)

### Action/Toast History

- [x] Persist a history list of engine result messages in app state (ordered timeline)
- [x] Capture action metadata per entry (turn number, actor, action kind, result text, success/failure)
- [x] Add "History" button to open a modal timeline view
- [x] Modal UX: dismiss with close button, outside click, and Escape key
- [x] Ensure history panel styling follows current game theme and remains readable on mobile

### Replayable Snapshot Debugger

- [x] Add timeline snapshots in app state after each resolved action (state, action input, produced events, nextSequence)
- [x] Include pre-action and post-action snapshots to inspect invalid actions and successful transitions
- [x] Add snapshot list UI controls (jump to snapshot, step backward, step forward, jump to latest)
- [x] Add clear snapshot labels (turn, actor, action kind, short result summary)
- [x] Add branch-from-snapshot flow so we can continue gameplay from any prior snapshot for what-if debugging
- [x] Make snapshot parsable from URL so it's shareable and repeatable easily. Similar to chess. -- CRITICAL --
- [x] Add deterministic RNG checkpoint metadata per snapshot (seed + rng cursor/step count)
- [x] Add engine RNG restore/advance utility so loading a snapshot resumes with the same future roll sequence
- [x] Validate replay determinism by rebuilding from seed + action log and comparing snapshot events/state
- [x] Add quick copy/export for action log plus snapshot metadata for bug reports and repro sharing

### Unified Extensible Game Settings

- [ ] Define settings module structure by feature section (battle state, events, action history, snapshots, RNG, inspector)
- [ ] Add collapsible sections with independent open/closed state persistence
- [ ] Add global "collapse all / expand all" controls for fast navigation
- [ ] Add fully minimized mode that collapses settings into a very small docked chip/button
- [ ] Add quick restore from minimized mode while preserving current tab/section state
- [ ] Add compact and full layout modes (compact for gameplay, full for deep debugging)
- [ ] Persist settings UI preferences in local storage (position, size, collapsed sections, minimized state)
- [ ] Add keyboard shortcuts for open/close, minimize, and section navigation
- [ ] Add extensibility contract for new settings sections (shared section API + registration pattern)
- [ ] Ensure settings can be safely extended without changing engine architecture (UI-only composition over game API)
- [ ] Add visual polish pass for readability (spacing, hierarchy, sticky controls, scroll behavior)
- [ ] Ensure responsive behavior: usable on mobile and narrow desktop widths

### Improved draft

```md

# CMD Hero Fights — Action History & Snapshot Debugging

## Title

Action History, Deterministic Snapshots, and Replay Support

---

## Summary

We need a lightweight but reliable system to:

* Track what happened (player-facing history)
* Inspect what happened (developer/debug snapshots)
* Reproduce what happened (determinism + replay)

This system should NOT become a full-blown replay engine or simulation platform. It should remain focused on three goals:

1. **Determinism** — same inputs produce same outputs
2. **Repeatability** — we can reproduce any game state from seed + actions
3. **Explainability** — the client can answer "what just happened" clearly

The system must integrate with the current engine design. We should extend existing structures where possible and only refactor when necessary to support determinism and inspection.

---

## Goals

### Primary

* Provide a persistent **action history timeline** for the player
* Capture **engine snapshots** for debugging and replay
* Ensure **deterministic execution** with RNG control
* Enable **reproducible bug reports and state sharing**

### Secondary

* Allow stepping through game progression
* Allow branching from previous states
* Improve visibility into engine decisions without exposing raw complexity to the player

---

## Non-Goals

* Building a full cinematic replay system
* Recording animations or visual timelines
* Replacing the engine architecture
* Introducing heavy abstractions that don’t align with current code

---

## Design Principles

1. **Extend, don’t rewrite**
   Integrate with current engine structures. Only refactor where determinism or logging is blocked.

2. **Keep logs human-readable first**
   Player-facing history must remain concise and understandable.

3. **Snapshots are for correctness, not UI**
   Snapshots should be complete and reliable, even if large. UI can derive views from them.

4. **Determinism is non-negotiable**
   Every action must be reproducible from seed + action log.

5. **Minimal surface area**
   Avoid introducing unnecessary abstractions or complex frameworks.

---

## Core Concepts

### 1. Action History (Player-Facing)

A linear list of resolved actions shown to the player.

Each entry includes:

* Turn number
* Actor (player/unit)
* Action kind (play, attack, ability, etc.)
* Target(s)
* Result summary text
* Success / failure
* actionId / sequence number
* reference to snapshot

### Behavior

* Only **top-level actions** appear by default
* Derived/internal events are either:

  * summarized into the result text
  * or expandable in UI

---

### 2. Snapshots (Engine State)

A snapshot is a restorable engine state at a specific point.

Each snapshot contains:

* Full game state
* RNG state (seed + cursor/step)
* Turn number
* Actor
* Action input
* Result summary
* Sequence id / nextSequence

Two types:

* **Pre-action snapshot** (before validation/execution)
* **Post-action snapshot** (after resolution)

---

### 3. Action Log (Replay Input)

A compact list of actions:

* actor
* action type
* parameters (targets, card id, etc.)

This is the minimal data required to rebuild the game.

---

## System Behavior

### On each action attempt

1. Capture **pre-action snapshot**
2. Execute action
3. Capture **post-action snapshot**
4. Append to:

   * action history (player-facing)
   * action log (replay)
   * snapshot list (debug)

---

## Determinism Requirements

### RNG

* All randomness must come from a deterministic RNG
* Snapshot must include:

  * seed
  * current RNG position (cursor / step count)

### Engine utilities

* Ability to:

  * restore RNG state
  * advance RNG deterministically

---

## Replay Requirements

### Minimal replay

* Rebuild game from:

  * initial seed
  * action log

### Validation

* After replaying, compare:

  * final state
  * event outputs

If mismatch occurs → determinism bug

---

## Snapshot Navigation (Dev UI)

Required controls:

* Jump to snapshot
* Step forward
* Step backward
* Jump to latest
* Branch from snapshot (continue gameplay from that point)

---

## URL Shareable State (Critical)

We must support loading a game / snapshot from URL.

### Minimum payload

* seed
* action log
* snapshot index

Behavior:

* Load → rebuild → jump to snapshot

This enables:

* bug reproduction
* sharing scenarios
* debugging

---

## Export / Debug Support

Provide quick export for:

* action log
* seed
* snapshot metadata

Used for:

* bug reports
* reproduction

---

## UI Requirements

### History panel

* Accessible via button
* Modal or side panel
* Scrollable list
* Clean readable entries
* Expandable details (optional)

### Snapshot debugger (dev-focused)

* Not required for players
* Can be hidden behind dev mode

---

## Acceptance Criteria

### History

* Player can view past actions
* Entries are readable and useful
* No engine spam in default view

### Snapshots

* Engine state can be restored from any snapshot
* Pre and post action states are available

### Determinism

* Same seed + actions always produce same result
* Replay rebuild matches original state

### URL sharing

* A shared URL reproduces the same game state

### Integration

* Works with current engine without large rewrites
* No unnecessary duplication of state

---

## Implementation Phases

### Phase 1 — History

* Implement action history list
* Add UI panel

### Phase 2 — Snapshots

* Capture pre/post snapshots
* Add navigation controls (basic)

### Phase 3 — Determinism

* Ensure RNG tracking
* Add replay rebuild check

### Phase 4 — Sharing

* Implement URL-based loading
* Add export tools

### Phase 5 — Optional Enhancements

* Branching
* Compare snapshots

---

## Success Criteria

* You can answer “what just happened” instantly from history
* You can reproduce any game from seed + actions
* You can debug invalid or strange behavior using snapshots
* The system remains simple, aligned with existing code, and does not overcomplicate the engine

---

## Short Internal Version

Add a lightweight system for action history and deterministic snapshots. Track player-visible actions, store pre/post engine states, ensure RNG determinism, and allow replay from seed + action log. Integrate with existing engine code, avoid overengineering, and focus on reproducibility and clarity.
```

### IA / UI Details Rehaul

#### Draft

```md
# CMD Hero Fights — Information Architecture / UI Details Rehaul

## Title

Information Architecture, Details Panel, and On-Board Indicators Rehaul

## Summary

The current client-side information architecture has become overloaded, inconsistent, and interaction-hostile. Important game information is spread across hover tooltips, floating popups, entity indicators, hand cards, card details, and duplicated UI logic paths. In practice, this causes severe usability issues: hover tooltips block selection, disappear when the mouse moves, become scrollable in unusable ways, overload the viewport with dense text, and fail to scale for stat-heavy cards or mobile interaction.

We need a deliberate redesign of how information is structured, revealed, compared, and interacted with across the entire client. The goal is not to reduce information density by hiding important details, but to present the same or greater level of information in a cleaner, more unified, more accessible system that does not interfere with gameplay.

This rehaul should take inspiration from information-dense games such as MMORPGs, League of Legends, Dota, XCOM, and Hearthstone, while remaining appropriate for both desktop and mobile.

---

## Problem Statement

The current UI has several structural problems:

1. **Hover tooltips are overloaded and unreliable**

   * They contain too much information.
   * They disappear when the cursor moves.
   * They can block interaction with the battlefield.
   * Internal scrolling is effectively unusable because the page scroll competes with the tooltip scroll, and moving to the tooltip scrollbar can dismiss the tooltip.

2. **Information architecture is fragmented and duplicated**

   * Different UI surfaces have different patterns for showing details.
   * Cards, companions, passives, actives, hand items, totems, field entities, and stat sources do not appear to follow one unified disclosure model.
   * Similar information is rendered differently in different places, likely with duplicated code and inconsistent behavior.

3. **On-board indicators do not scale for stat-heavy entities**

   * Stat pills and bonus indicators overflow or expand into awkward shapes.
   * Cards that grant many modifiers, such as Merewen, can create unreadable battlefield clutter.
   * The battlefield should show important tactical state at a glance, but not become a secondary spreadsheet.

4. **Current UX is interaction-hostile**

   * Reading information can interfere with selecting cards or targets.
   * The player is forced to hover precisely and carefully rather than plan comfortably.
   * There is no robust inspect/compare workflow.

5. **Mobile support is fundamentally underserved by hover-dependent design**

   * Hover is not a first-class interaction on touch devices.
   * Dense tooltip architectures do not translate well to mobile.

---

## Goals

### Primary goals

* Replace hover-first overloaded details with a **unified inspect/details architecture**.
* Preserve or improve total reachable information; no critical information should become inaccessible.
* Remove tooltip-driven interaction conflicts.
* Make detail viewing work well on both desktop and mobile.
* Create a reusable information architecture system instead of one-off implementations.

### Secondary goals

* Improve visual hierarchy and readability of stat-heavy information.
* Support comparison and planning workflows.
* Standardize indicator behavior, naming, disclosure levels, and detail rendering.
* Reduce UI clutter on the battlefield while retaining tactical clarity.

---

## Non-Goals

* Redesigning the overall visual art direction of the game.
* Rebalancing card mechanics or changing gameplay rules.
* Removing detailed calculation breakdowns or stat source visibility.
* Dumbing down the game’s information density.

---

## Design Principles

1. **Inspect, don’t hover**
   Important information should be available through stable inspection, not fragile cursor positioning.

2. **Glance → inspect → expand**
   Information should be revealed in layers:

   * glanceable battlefield state
   * stable selected-object summary
   * optional deep breakdown/calculation details

3. **One mental model across the whole client**
   The same disclosure pattern should apply everywhere: battlefield entities, hand cards, passives, weapons, companions, totems, status effects, actives, and other inspectable objects.

4. **Interaction must never fight information access**
   Viewing details must not block clicks, target selection, or pointer travel.

5. **Dense information is acceptable; chaotic information is not**
   The solution should support complex calculations and many modifiers, but through hierarchy and structure.

6. **Touch-first compatibility matters**
   The architecture must work without relying on hover.

---

## Proposed Direction

### Core shift

Move from a tooltip-centric system to a **selection-based information layer**.

Instead of showing large, ephemeral detail blobs on hover, selecting or focusing an object should populate a dedicated **Details / Inspect HUD panel**.

### High-level model

* **Battlefield and hand remain the primary action surfaces**.
* **A persistent Details Panel** becomes the primary information surface.
* **Hover, if retained, becomes lightweight and optional**: only brief hints or labels, never the full data dump.
* **Expanded breakdowns** are shown inside stable panels, drawers, tabs, accordions, or overlays.

---

## Proposed UX Structure

### 1. Glance Layer (always visible, minimal)

Purpose: communicate tactical state quickly without overload.

Examples:

* HP bar
* small stat chips/icons for core combat stats
* limited count/summary of statuses
* visual state markers (armed, reactive, taunt, shielded, etc.)
* compact buff/debuff summary, not full prose

Rules:

* Must remain compact and visually stable.
* Must not overflow awkwardly when a unit has many modifiers.
* Must prioritize tactical clarity over completeness.

### 2. Inspect Layer (stable, selection-based)

Purpose: show full details of the currently selected entity/card/effect.

Examples of content:

* full card text
* passives and keywords
* active abilities
* stats (base + bonus)
* modifier source breakdowns
* targeting restrictions
* trigger timing / rules text
* runtime calculation breakdowns

Rules:

* Appears in a persistent details area, not a hover blob.
* Must remain visible while the user moves the cursor elsewhere.
* Must support both click/tap selection and keyboard/controller focus.

### 3. Deep Breakdown Layer (optional expansion)

Purpose: allow stat-heavy reasoning and debugging-grade clarity.

Examples:

* “AD 10 = base 4 + Merewen +6”
* “Armor +3 from adjacent allies, +2 from totem”
* trigger chains
* pre-luck and post-luck ranges
* damage formula explanation

Rules:

* Hidden by default unless requested.
* Should be expandable via tabs, accordions, or “show calculation” toggles.
* Must not require hover precision.

---

## Comparison Needs

A single selected-details panel may not be enough. The new system should explicitly support comparison and planning.

Possible acceptable patterns:

* **Pinned compare slots**: user can pin one or two cards/entities for side-by-side inspection.
* **Temporary compare tray**: selected object remains in main panel while another object can be peeked alongside it.
* **Desktop split inspect / mobile swipe compare**.

At minimum, the design must answer:

* How does a player compare two hand cards?
* How does a player compare two board entities?
* How does a player inspect a unit while targeting another?
* How does a player keep one detail open while checking another source?

---

## Battlefield Indicator Rework

We need a new strategy for on-board information density.

### Current issue

Indicators grow too large and become visually broken when many bonuses are shown directly on the battlefield.

### Required direction

The battlefield should show **summaries**, not full equations everywhere.

Possible approaches to explore:

* compact stat chips with only total values at glance level
* optional modifier badges or small delta markers
* a toggle or details mode that reveals base+bonus split when explicitly requested
* status icon grouping with expandable details in the inspect panel
* overflow counters that are always inspectable and never hide information permanently

### Requirement

No “+2 more” dead-ends. If summarization exists, it must always lead to a full inspectable breakdown.

---

## Accessibility and Reliability Requirements

* Must work without hover as a required interaction.
* Touch interaction must be first-class.
* Keyboard accessibility should be supported where practical.
* Scroll behavior must be deterministic and non-conflicting.
* Detail surfaces must not disappear unexpectedly.
* UI overlays must not steal or block unrelated interaction unless intentionally modal.
* Text must remain legible at realistic desktop and mobile sizes.

---

## Technical / Architecture Requirements

### We need a unified inspectable-information system

Rather than custom rendering paths per object type, introduce a shared information architecture foundation.

Possible architectural direction:

* a common `Inspectable` or equivalent view-model contract
* standardized sections such as:

  * header / identity
  * keywords
  * passives
  * actives
  * vitals
  * combat stats
  * statuses
  * modifier breakdowns
  * source references
* reusable components for:

  * stat row
  * modifier list
  * keyword list
  * ability section
  * compact indicator chip
  * details panel section
  * compare card/panel

### Desired engineering outcomes

* reduced duplication
* consistency across all game object surfaces
* easier future extension when new mechanics are added
* predictable rendering rules for both glance and inspect layers

---

## Deliverables

### Product / UX deliverables

1. A clear IA proposal for how game information is structured across glance / inspect / deep breakdown layers.
2. Wireframes or mockups for:

   * desktop battlefield + details panel
   * mobile battlefield + details drawer/sheet
   * comparison workflow
   * dense entity with many modifiers
3. Interaction rules for:

   * select
   * inspect
   * compare
   * target while inspecting
   * mobile tap / long-press behavior

### Engineering deliverables

4. Refactored reusable inspect/details component system.
5. Unified rendering model for inspectable objects.
6. Reworked battlefield indicators with overflow-safe behavior.
7. Removal or drastic reduction of heavyweight hover tooltips.
8. Responsive implementation for desktop and mobile.

---

## Acceptance Criteria

### Information architecture

* All important gameplay information currently reachable through tooltips remains reachable in the new system.
* No primary gameplay-critical information depends on unstable hover behavior.
* The user can inspect any relevant object from battlefield or hand in a stable way.

### Interaction quality

* Reading details does not interfere with selecting cards, targets, or entities.
* Tooltip disappearance due to cursor movement is no longer a critical path problem.
* There are no scrollable hover panels that require fragile pointer positioning.

### Comparison

* User can compare at least two objects in a practical way without losing the first object’s information.
* Comparison flow works on both desktop and mobile.

### Battlefield readability

* Stat-heavy entities no longer break battlefield layout with oversized indicator pills.
* Glance-level battlefield state remains readable even for units with many modifiers.
* Full detail remains available through inspect flow.

### Architecture quality

* Common inspect/detail behavior is reused across cards, companions, passives, actives, hand items, totems, and battlefield entities.
* Duplication in IA/detail rendering logic is materially reduced.
* The resulting code is easier to extend for future mechanics.

### Accessibility / platform support

* Core inspect flows work on mobile without hover.
* Pointer, keyboard, and touch interactions are all considered.
* Scroll behavior is reliable and predictable.

---

## Suggested Implementation Phases

### Phase 1 — Audit and taxonomy

* Audit all current information surfaces.
* List every place where gameplay details are currently shown.
* Classify information into glance / inspect / deep-breakdown categories.
* Identify duplicated rendering logic and incompatible patterns.

### Phase 2 — IA and interaction design

* Define the unified inspect model.
* Define desktop and mobile interaction flows.
* Decide comparison/pinning strategy.
* Define new battlefield indicator rules.

### Phase 3 — Shared component foundation

* Build reusable detail panel and section components.
* Build shared stat and modifier breakdown components.
* Build compact indicator primitives.

### Phase 4 — Surface migration

* Migrate battlefield entities.
* Migrate hand cards.
* Migrate totems, passives, actives, statuses, and special object types.
* Remove or downgrade legacy heavy tooltips.

### Phase 5 — Polish and validation

* Test on desktop and mobile.
* Test high-modifier edge cases such as Merewen.
* Validate no information loss.
* Validate interaction during targeting and planning.

---

## Edge Cases to Explicitly Test

* A card/unit with many simultaneous modifier sources.
* A card with long rules text plus multiple passives and active abilities.
* A unit whose stats have large base+bonus equations.
* Inspecting while target selection is active.
* Comparing two hand cards while also planning a board action.
* Mobile tap behavior when switching between board inspect and hand inspect.
* Units with many statuses, keywords, and temporary effects.
* Entities whose battlefield indicators previously overflowed or became unreadable.

---

## Success Criteria

This task is successful when the client no longer feels like it is fighting the player for information access. Dense game state should feel inspectable, deliberate, and trustworthy rather than chaotic. The player should be able to glance quickly, inspect stably, and reason deeply without hover gymnastics, visual clutter, or missing information.

---

## Short Internal Version

Rework the entire client information architecture away from overloaded hover tooltips into a unified selection-based inspect/details system with stable panels, reusable detail components, overflow-safe battlefield indicators, comparison support, and mobile-first interaction patterns. Preserve all gameplay-critical information, reduce duplication, eliminate interaction conflicts, and make dense stat/state inspection practical for both desktop and mobile.

```
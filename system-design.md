# CMD Hero Fights Demo — System Design

## Relationship to AI Instructions

This document defines the architecture and reasoning.

AI agents must follow the rules defined in:
- cmd-hero-fights-ai-instructions.md

In case of conflict:
- Instructions document overrides for implementation behavior
- System design remains the conceptual reference
- Ask for clarification if instructions conflict with design or are unclear

## Purpose

This document defines the system design, implementation policy, and mental model for the **CMD Hero Fights** web-based prototype.

It is intended to be used by both:

* human developers
* AI coding agents

This is a **lean prototype document**, not a full production architecture.

The goal is to build a **minimal, playable, deterministic battle demo** that validates the game’s core mechanics and enables quick playtesting and iteration.

---

## Prototype Philosophy

This prototype follows these principles:

* Keep the system **dead simple and lean**.
* Build only what is needed for the current playable demo.
* Do not implement speculative systems.
* Do not implement unused effects, events, content, or abstractions.
* Prefer clarity and directness over framework-heavy or infrastructure-heavy solutions.
* Keep the architecture clean enough that future systems such as logging, debugging, tests, or content pipelines can be added later without rewriting the whole engine.

### Explicit Non-Goals for the Prototype

The following are intentionally **out of scope for the initial prototype**:

* automated tests
* debug logging
* combat logs
* content compilation pipelines
* automated synchronization with design/reference content
* production hardening
* performance optimization beyond what is naturally achieved through clean design

The engine should still be designed such that it is:

* serializable
* deterministic
* structurally loggable in the future
* structurally testable in the future

But these capabilities will **not** be implemented now.

---

## High-Level Goal

Build a minimal split-screen web demo where two players can play a simplified but real version of CMD Hero Fights using:

* a TypeScript engine
* Bun runtime
* runtime game content defined manually in TypeScript
* a simple web UI for interaction and playtesting

The battle engine must be UI-agnostic and expose its functionality only through explicit player-driven actions.

---

## Technology Direction

### Runtime and Language

* **TypeScript** only
* **Bun** as runtime
* strict **no Node.js** policy

### Recommended Minimal Libraries

* **zod** for runtime validation of manually-authored content and selected runtime structures
* **seedrandom** for deterministic seeded randomness

### Optional Libraries

Use only if clearly needed:

* **immer** for ergonomic state updates if it materially improves clarity
* **ts-pattern** for ergonomic pattern matching if it improves clarity in complex logic

### Avoid by Default

* heavy frameworks in the engine
* unnecessary state-management libraries
* speculative utility libraries
* excessive dependencies

---

## Project Structure

The prototype should remain minimal.

Suggested structure:

```txt
game/
  content/
  engine/
  shared/
  app/
```

### `game/content`

Contains the runtime content used by the prototype.

This content is:

* manually authored
* cleanly modeled in TypeScript
* validated with zod at runtime where appropriate
* completely independent from the original design/reference content

### `game/engine`

Contains the battle engine.

This includes:

* game state models
* battle loop
* action handling
* effect resolution
* event emission
* listener installation and execution
* battlefield logic
* RNG usage
* core mechanics

### `game/shared`

Contains shared types and contracts used by content and engine.

### `game/app`

Contains the web-based split-screen demo UI.

The app should consume the engine as a client of the engine API. It should not contain battle logic.

---

## Reference Content Policy

There are two separate notions of content:

### 1. Reference Content

The large mounted reference content exists only for:

* designer/developer reference
* AI agent reference
* reading card values and mechanics from the original material

It has **no runtime role** in the prototype.

There is:

* no automated reading from it
* no compilation from it
* no synchronization with it
* no schema bridge to it
* no direct references to it at all; it is purely a static reference for developers and AI agents to read from manually when creating the runtime content.

It is mounted as a read-only directory under `content/`.

### 2. Runtime Prototype Content

The actual prototype uses a separate runtime content set defined manually in TypeScript.

This runtime content is:

* a small selected subset of the real game
* modeled cleanly according to the runtime engine needs
* designed for execution, not for design documentation

The initial prototype will likely use only around 10–20 cards and a very small subset of the full game.

---

## Core Architectural Principles

### 1. Engine/UI Separation

The engine must not assume any UI.

The engine should expose a clear API that the web app calls.

The UI is responsible only for:

* rendering state
* collecting player input
* sending player actions to the engine
* showing results

### 2. Explicit Player Actions

The engine API should only expose functionality through **player actions**.

The app should not mutate state directly.

Examples of player actions include:

* basic attack
* use weapon
* trigger companion action
* play card
* choose a target
* choose one of multiple generated card options
* press the luck button
* end turn
* any other legal player-initiated battle action

Internal engine mechanics may perform internal operations, but the public interface of the engine should remain action-driven.

### 3. Deterministic Simulation

The engine must be deterministic.

All randomness must be controlled by a seeded RNG source.

The same:

* initial seed
* content
* initial battle state
* sequence of player actions

must always produce the same result.

### 4. Serializable State

Engine state should be plain and serializable.

Even though serialization is not a current feature, the architecture should preserve it naturally.

### 5. OOP-Friendly Design

This prototype is allowed and expected to use **object-oriented design** where it improves clarity and aligns with the game’s mental model.

The game’s design is intuitively object-oriented, and the implementation may reflect that.

However:

* object orientation should be used to improve readability and structure
* not to hide core state changes in unpredictable ways
* not to introduce deep inheritance hierarchies without clear value

A good target is:

* clear domain objects
* clear responsibilities
* explicit state transitions
* minimal magic

---

## Demo Scope Policy

The prototype must be intentionally narrow.

Only implement:

* the minimum number of heroes needed
* the minimum number of cards needed
* the minimum number of effects needed
* the minimum number of events needed
* the minimum number of battlefield mechanics needed
* the minimum number of actions needed

No system should be implemented “for future completeness.”

The prototype exists to validate gameplay, not to finish the full game.

The chosen content for the prototype is defined in [prototype-content.md](/prototype-content.md).

---

## Runtime Content Model Philosophy

Each runtime content item should be modeled cleanly and minimally.

Content should be written in a way that is easy to:

* read
* validate
* extend
* use from the engine

The runtime content should be based on a small number of concepts:

* heroes
* cards
* effects
* battlefield-related definitions if needed
* possibly weapons/companions/summons depending on the selected prototype slice

### Card Implementation Policy

Each card is implemented as:

1. core fields based on its card type
2. a list of effects with parameters

A card should not contain arbitrary custom logic.

A card should primarily declare:

* what it is
* what it costs
* what it targets
* what effects it performs

The logic for effects belongs in effect implementations inside the engine.

---

## Effect Implementation Policy

Effects are implemented only when first needed.

### Rule

When creating a new card:

1. identify all effects the card needs
2. for each effect:

   * if it already exists, reuse it
   * if it does not exist, implement it

This keeps the prototype lean and prevents speculative overengineering.

### Effect Shape

An effect should ideally be:

* a typed runtime content definition
* interpreted by an engine-side effect implementation

The engine should contain the execution logic for each effect type.

### Effect Design Goal

Each new effect should be implemented in a reusable way whenever possible.

Even in a prototype, avoid effect implementations that are impossible to reuse unless the mechanic is truly unique, in which case, it should still be implemented as a new effect type with parameters rather than as a one-off hardcoded behavior, even if it will only be used by one card.

---

## Event System Policy

The prototype uses an **emit-only-when-needed** event policy.

Events are introduced only when a mechanic actually requires them.

### Rule

If a newly implemented effect or mechanic needs to listen for a game event:

1. check whether that event already exists
2. if it exists, use it
3. if it does not exist, add it carefully to the engine
4. update the relevant mechanics so that event is emitted at the correct lifecycle point

### Important Design Constraint

Because events may be added incrementally, core mechanics and effect resolution should make good use of reusable abstractions so that adding a new emitted event later does not require duplicated changes in many places.

### Event Philosophy

Events are gameplay lifecycle hooks used by listeners and triggered mechanics.

Examples may include things like:

* card played
* summon created
* damage dealt
* object destroyed
* turn started
* turn ended

But only introduce an event when the prototype actually needs it.

---

## Listener / Trigger Policy

Some effects may install listeners onto the battle state.

Listeners should be treated as first-class runtime gameplay constructs.

The engine must be designed so that listeners can:

* be added by effects
* observe supported engine events
* execute additional effects or operations when triggered
* expire when appropriate

### Listener Lifetime

Even in the prototype, listener lifetime must be explicit.

A listener should specify how long it exists, for example:

* once
* until end of turn
* persistent until source leaves play
* permanent for battle duration

Only implement lifetime variants when needed by actual prototype content.

---

## Engine API Design

The battle engine should expose a small public API.

Suggested shape:

* create battle
* query state
* get legal actions if needed
* apply player action

The engine should not expose arbitrary low-level mutation functions.

### Public Engine Boundary

At a conceptual level, the engine should accept:

* runtime content definitions
* battle setup parameters
* player setup
* seed
* player actions

And it should return updated state and any relevant action result information.

---

## Internal Engine Layers

A useful mental model for the engine is:

### 1. Models

Definitions for battle state, entities, cards, effects, events, positions, and actions.

### 2. Action Handling

Receives a player action and validates whether it is legal in the current battle state.

### 3. Resolution / Game Loop

Performs the sequence of operations caused by the action.

### 4. Effects

Executes the content-defined effects.

### 5. Event Emission

Emits supported events when required by current mechanics.

### 6. Listener Resolution

Processes installed listeners that react to emitted events.

### 7. Core Mechanics

Damage, shields, adjacency, battlefield occupancy, turn flow, hand rules, and other shared rules.

---

## Public Action Model

The engine’s public API should revolve around a typed set of player actions.

Examples of action categories include:

* turn actions
* card actions
* target selection actions
* equipment/weapon actions
* companion actions
* luck-related actions

Exact action definitions should be implemented only as needed by the prototype.

### Important Rule

Any action the player can perform in the UI must correspond to a real engine action.

No UI-only gameplay logic should exist.

---

## Resolution Model

The engine must have a clear resolution model.

The exact implementation may evolve, but this is the intended conceptual order:

1. receive player action
2. validate legality
3. pay costs or consume usage where applicable
4. perform the primary operation
5. resolve direct effects
6. emit relevant events if those events currently exist in the prototype
7. resolve any listeners triggered by those events
8. apply resulting state changes
9. finalize the action

This process may recurse or chain as needed depending on effect behavior.

The key requirement is that action resolution remains explicit, structured, and deterministic.

---

## RNG Strategy

The prototype uses deterministic seeded randomness.

### Rules

* all randomness must go through a single engine-controlled RNG source
* no direct use of uncontrolled randomness in gameplay logic
* seed-based reproducibility is required

### Recommended Library

* **seedrandom**

### Why This Matters

This is especially important because luck is a core mechanic and must behave consistently.

---

## Luck System

Luck is a post-RNG outcome modifier.

### Core Rule

* **1 Luck Point = 25% outcome shift**
* luck modifies the result **after** RNG is rolled

### General Process

For any ranged outcome such as damage:

1. calculate the range after scaling
2. roll a normal RNG result within the range
3. modify the roll based on luck

### Positive Luck

Positive luck pushes the rolled result toward the maximum.

Formula:

```txt
final = roll + (max - roll) × luck%
```

Example:

* roll = 8
* max = 12
* gap = 4
* luck = +2 points = 50%
* adjustment = 4 × 0.5 = 2
* final = 10

### Negative Luck

Negative luck pulls the rolled result toward the minimum.

Formula:

```txt
final = roll - (roll - min) × |luck%|
```

Example:

* roll = 8
* min = 6
* gap = 2
* luck = -2 points = 50%
* adjustment = 2 × 0.5 = 1
* final = 7

### Key Properties

* +100% luck → always maximum outcome
* 0% luck → pure RNG
* -100% luck → always minimum outcome

### Damage Calculation Order

Damage follows this sequence:

1. damage scaling is added to minimum and maximum
2. RNG is rolled
3. luck modifies the RNG result

Luck should be implemented centrally as part of outcome resolution, not improvised independently by each effect.

---

## Number Modifier System and Resolution Order

The prototype uses a unified **number modifier system** to track all adjustments to numeric values: entity stats (armor, attack damage, magic resist), effect payload parameters (damage ranges, draw counts, heal amounts, refunds), and action constants (basic attack ranges, luck deltas).

### Key Principles

* All numeric modifications are **traceable** via modifier records with source metadata
* Resolution order is **deterministic**: base → temporary modifiers → passive rules → finalization
* Modifiers support **lifetimes and conditions**: expiration and activation rules are explicit
* **No direct mutation**: instead of mutating state, modifiers are applied during resolution and recompute effective values

### Deterministic Resolution Order

Given a numeric property on a target entity, the effective value is computed as:

**Phase 1: Base Value**
- Start with immutable base value (entity stat, effect parameter, action constant)

**Phase 2: Temporary Modifiers (Application Sequence Order)**
- Apply active `NumberModifier` instances filtered by matching `propertyPath` and `targetEntityId`
- Order: chronological by modifier creation sequence (deterministic ordering)
- Check: only apply if modifier condition is satisfied (source exists, etc.)
- Check: only apply if modifier lifetime is active (not expired)
- Operation: apply modifiers.operation (add/subtract/set) to accumulated value

Example: `base=5 → +2 (temp mod) → 7 → -1 (temp mod) → 6`

**Phase 3: Passive Rules (Source Position Order)**
- Apply active `PassiveRule` instances filtered by matching target selector
- Order: by source entity battlefield position (deterministic spatial ordering)
- Targets: resolve target selector to affected entities
- Check: only apply if rule condition is satisfied
- Check: only apply if rule lifetime is active
- Operations: apply all numeric operations in the rule

Example: `value=6 → +1 (War Standard) → 7 → +2 (adjacent unit) → 9`

**Phase 4: Finalization**
- Clamp to valid range (e.g., armor ≥ 0)
- Round/floor as needed
- Ensure type correctness

### Property Path Convention

Numeric properties are referenced using dot notation:

- **Entity stats**: `armor`, `attackDamage`, `magicResist`, `health`
- **Effect parameters**: `dealDamage.minimum`, `dealDamage.maximum`, `heal.amount`, `drawCards.amount`, `refundMoveCost.amount`
- **Action constants**: `basicAttack.min`, `basicAttack.max`, `pressLuck.delta`

### Determinism Guarantee

Given identical seed, battle state, content, and action sequence, the effective numeric value for any property must always be identical. This requires:

* No RNG in resolution logic (pure computation)
* Stable, deterministic modifier/rule ordering
* Conditions must not depend on randomness
* Resolution produces no state side effects (only computed values)

### UI Traceability

Resolved numbers include a `NumberExplanation` breakdown:
- base value
- list of contributions (source id, label, delta) in resolution order
- effective value

This enables players and debuggers to understand why a value is what it is.

---

## Draw and Hand Rules

### Hand Soft Cap

* soft cap = 4
* at the start of a turn, a player only draws if they have fewer than 4 cards

### Hand Hard Cap

* hard cap = 7
* players cannot exceed 7 cards in hand under any condition

### Implication

Effects that add cards to hand must still obey the hard cap.

---

## Battlefield Model

The game includes a battlefield and this must be part of the prototype design.

The battlefield is not an optional detail; it is a core gameplay structure.

### Battlefield Concept

The battlefield is a slot-based layout containing:

* hero area(s)
* battlefield slots
* adjacency relationships
* position-sensitive buffs and protections
* reachability and targeting implications

Based on the current reference concept, the battlefield should be treated as a structured positional grid with special relationships around the hero and surrounding slots.

### Prototype Requirement

The battlefield model must support:

* occupancy
* adjacency
* horizontal relationships
* vertical relationships
* area targeting
* completion-based formation checks where needed
* special hero-adjacent interactions

The exact internal representation may be chosen freely as long as these mechanics can be expressed clearly.

---

## Battlefield Rules (Current Prototype Scope)

The following battlefield mechanics are currently part of the design intent and should be represented in the system design.

### Adjacency Buffs

Adjacency buffs are positional bonuses that apply when a summonable or hero is next to another object.

The design intention references a 3×3 adjacency concept centered on the newly summoned object.

### Hero Adjacency

* on summon next to hero: grant **3 HP shield for 1 turn**

### Horizontal Buffs

* two together: **+1 resistance for each**
* three together: **middle +2 resistance, outer +1 resistance**
* four together: **+2 resistance**

### Vertical Buffs

* two vertically aligned: **+1 resistance**

### Square Completion (2×2)

* on completion: **5 HP shield** to the 4 objects

### Full Horizontal Line

* grants **+3 resistance**
* grants **3 HP shield to all when completed**
* hero becomes **unreachable**

### Full Hero Adjacency Concept

Current intended concept includes the full horizontal line in front of the hero plus the two side-adjacent slots.

Potential effects:

* hero gains **+3 resistance**
* hero gains **+1 move**
* hero gains **+1 AP/AD**
* on completion, **+5 HP shield** to all adjacents

This is included here as current design intent and should be treated as a mechanic to support if selected for the prototype slice.

### Side Protection / Reachability Concept

If an object on the far left or far right has two objects directly in front of it, it may become unreachable.

This is intended to allow protection of valuable objects such as:

* totems
* weapons
* companions

### Target Area Types

The battlefield system must support target area definitions such as:

* **single**: one target only
* **adjacent**: one target and all of its adjacents
* **full**: the entire battlefield

---

## Battlefield Design Guidance

Because the battlefield contains positional rules, avoid scattering adjacency logic across unrelated systems.

Prefer a dedicated battlefield representation and helper layer responsible for:

* position indexing
* neighbor lookup
* line/group detection
* completion detection
* reachability checks
* target area resolution

This keeps effect and card implementations simpler.

---

## Content Authoring Workflow

The prototype should follow a repeatable workflow for adding new content.

### Adding a New Card

When implementing a new card:

1. choose the card from the real design reference
2. manually create its runtime content version in `game/content`
3. define its core fields according to the runtime model
4. identify all required effects
5. for each required effect:

   * reuse an existing effect implementation if available
   * otherwise implement the new effect
6. identify whether any new listener behavior is needed
7. identify whether any new event must be emitted to support that listener behavior
8. add only the minimum necessary engine support
9. validate the card content with zod
10. use it in the prototype

### Content Design Rule

New content should always be added one item at a time, and each addition should keep the prototype lean.

No unused cards, effects, or events should be added “for later.”

---

## Validation Philosophy

There is no content compilation pipeline.

Validation should remain simple.

### Rule

Manually-authored runtime content may be validated at runtime using zod.

This validation exists only to catch accidental authoring mistakes in the prototype content.

It is not meant to become a heavy pipeline or production content system.

---

## OOP Guidance

Because this prototype intentionally allows an object-oriented design, these guidelines should be followed:

### Good Uses of OOP

* modeling domain concepts clearly
* grouping related behavior with the right concept
* creating readable engine modules/classes
* representing engine services such as RNG or battlefield helpers
* structuring effect execution and action handling cleanly

### Avoid

* deep inheritance hierarchies
* hidden state changes that make gameplay flow hard to follow
* scattering battle mutations across many unrelated objects
* coupling UI objects to engine objects

### Preferred Style

Use OOP as a clarity tool, not as an excuse for implicit behavior.

The engine should still have:

* explicit action flow
* explicit resolution flow
* explicit ownership of state

---

## Web Demo Design

The prototype will include a simple split-screen web app.

### Purpose

Its only purpose is to let developers and testers:

* play the game
* exercise the mechanics
* validate flow and usability
* get feedback

### UI Principles

* keep it simple
* do not overdesign it
* represent the battlefield clearly
* make available actions obvious
* keep interaction with the engine explicit

The UI is a consumer of the engine, not part of the engine.

---

## Initial Implementation Priorities

Implementation should proceed in this order:

1. initialize repository and TypeScript/Bun project structure
2. define shared runtime models and zod schemas
3. define battlefield model and positional helpers
4. define core battle state model
5. define public player action model
6. implement battle creation and base turn flow
7. implement hand rules and draw rules
8. implement RNG and luck handling
9. implement a small first set of effects
10. implement a small first set of cards
11. implement event/listener support only when required
12. build a minimal split-screen UI
13. expand content incrementally

---

## Current Open Design Items

The following items are recognized as design details that may still need refinement during implementation:

* final battlefield internal representation
* exact public action type definitions
* exact listener storage model
* exact effect type taxonomy
* exact reachability rules for side protection and hero protection cases
* exact handling of the “full hero adjacency” mechanic in the prototype slice
* whether all currently described battlefield buffs are included in the initial demo or introduced incrementally

These are not blockers to starting implementation. They should be resolved incrementally while preserving the principles in this document.

---

## Final Summary

This prototype is a **lean, deterministic, TypeScript/Bun-based battle demo** for CMD Hero Fights.

It uses:

* manually-authored runtime content
* a UI-agnostic engine
* explicit player actions
* incrementally implemented effects and events
* a battlefield-aware positional model
* seeded randomness with centralized luck handling
* object-oriented design where it improves clarity

It intentionally excludes:

* tests
* logging
* debugging systems
* content compilation
* any automated dependency on the larger design/reference content

The system should remain as small as possible while still being clean, understandable, and extensible enough to support iterative playtesting.

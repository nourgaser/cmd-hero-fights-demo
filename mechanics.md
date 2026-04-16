# Game Mechanics / Player Actions

## Overview

Players interact with the game through a **small, fixed set of core actions**.
All gameplay emerges from combinations of these primitives.

The system is intentionally minimal to:

* Keep gameplay clear and readable
* Enable deep emergent interactions
* Maintain strong control over game complexity

---

## Core Actions

The following are the only valid player-initiated actions:

* `PLAY_CARD`
* `PRESS_LUCK`
* `BASIC_ATTACK`
* `USE_WEAPON`
* `USE_COMPANION_ABILITY`
* `END_TURN`

---

## Design Principle: Explicit Action Types

Although some actions may appear mechanically similar, they are intentionally modeled as **distinct action types**.

For example:

* `USE_WEAPON`
* `USE_COMPANION_ABILITY`

These are kept separate by design to allow future mechanics, rules, and interactions to diverge clearly without ambiguity.

No additional battlefield-interactable entity types will be introduced beyond:

* Weapons
* Companions

---

## Targeting

Some actions require selecting one or more targets.

### Rules

* Targets are selected **before action execution**
* Each action defines:

  * Number of required targets
  * Valid target types (enemy, ally, self, empty slot, etc.)
* The engine must validate all targets before execution

### Examples

* `PLAY_CARD (Fireball)` → requires 1 enemy target
* `BASIC_ATTACK` → requires 1 enemy target
* `USE_WEAPON` → may require a target depending on weapon
* `PRESS_LUCK` → no target

---

## Action Lifecycle

All actions follow the same lifecycle:

1. **Intent**
   Player chooses an action

2. **Target Selection (if required)**
   Player selects valid targets

3. **Validation**
   The engine verifies:

   * It is the player's turn
   * The action is allowed in the current state
   * All targets are valid

4. **Execution**
   The action is applied to the game state

5. **Resolution**
   Effects, triggers, and chain reactions are processed

---

## Turn Constraints

* Players may only act during their turn
* When it is not their turn:

  * No actions are allowed
  * Any attempted input must be rejected by the engine

---

## Action Validity

An action is considered valid only if:

* It is the player's turn
* The action is available (not blocked, disabled, or restricted)
* All required resources (if any) are satisfied
* Targets (if required) are valid

Invalid actions must always be rejected at the **engine level**, regardless of UI safeguards.

---

## Design Notes

* The action system is intentionally minimal and stable
* New mechanics should build on top of existing actions rather than introducing new ones
* Most gameplay complexity should emerge from:

  * Effects
  * Modifiers
  * Triggers
  * Targeting rules

---

## Out of Scope

* Players cannot perform any actions outside their turn
* No hidden or implicit player actions exist outside this system
* All player interaction must go through one of the defined action types
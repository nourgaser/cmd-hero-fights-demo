# CMD Hero Fights Demo — AI Agent Instructions

## Purpose

This document defines the **rules and constraints AI agents must follow** when working on the CMD Hero Fights prototype.

It is a distilled operational guide derived from the system design document.

Agents must follow this strictly to keep the prototype:

* lean
* correct
* deterministic
* aligned with intended architecture

---

## Core Principle

This is a **lean prototype**, not a production system.

Agents must:

* implement only what is needed
* avoid overengineering
* avoid speculative features

---

## Absolute Rules

### 1. No Overengineering

* Do NOT add systems “for future use”
* Do NOT generalize prematurely
* Do NOT introduce abstraction unless it is immediately useful

### 2. No Tests

* Do NOT add unit tests
* Do NOT add integration tests
* Do NOT add test scaffolding

### 3. No Logging / Debugging Systems

* Do NOT add logs
* Do NOT add debug tools
* Do NOT add tracing systems

The engine should remain *capable* of logging in the future, but no implementation now.

### 4. No Content Compilation

* Do NOT create pipelines
* Do NOT read from reference content automatically
* Do NOT transform or sync content

Runtime content is **manually authored only**.

### 5. No Connection to Reference Content

* The mounted design/content directory is **read-only reference only**
* Do NOT import from it
* Do NOT parse it
* Do NOT depend on it

---

## Architecture Rules

### Engine is UI-Agnostic

* Engine must NOT depend on UI
* UI calls engine only through actions

### Action-Driven API Only

* Engine must expose functionality ONLY via player actions
* No direct state mutation from outside

### Deterministic Engine

* All randomness must be seeded
* Use a single RNG source
* No uncontrolled randomness

### Serializable State

* State must remain plain and serializable

### OOP Usage

* OOP is allowed and encouraged for clarity
* Avoid deep inheritance
* Avoid hidden side effects

---

## Content Rules

### Runtime Content Only

All content lives in:

```txt
game/content/
```

Content is:

* written in TypeScript
* validated with zod (optional but allowed)

### Content Scope

* Only implement content needed for demo
* Defined in [Prototype Content](/prototype-content.md)

### Card Structure

Each card must define:

* core fields
* list of effects

Cards must NOT contain custom logic by default.

---

## Effect System Rules

### Implement-on-Demand

When adding a card:

1. Identify required effects
2. Reuse existing ones if available
3. Otherwise implement new ones

### Effect Design

* Effects should be reusable when reasonable
* Avoid one-off implementations unless necessary

---

## Event System Rules

### Emit Only When Needed

* Do NOT predefine large event systems
* Add events only when required by a mechanic

When needed:

1. Add the event
2. Update engine to emit it
3. Keep changes minimal and centralized

---

## Listener Rules

* Effects may install listeners
* Listeners react to events

Each listener must define:

* what it listens to
* when it triggers
* how long it lives

Only implement lifetime types when needed.

---

## Battlefield Rules

* Battlefield is a **core system**, not optional
* Must support:

  * positions
  * adjacency
  * targeting
  * reachability

---

## RNG and Luck Rules

### RNG

* Must use seeded RNG (seedrandom)
* Must be centralized

### Luck

* Applied AFTER RNG
* Must be implemented centrally

Do NOT duplicate luck logic across effects.

---

## Action Model Rules

All gameplay must be triggered via actions.

Examples:

* play card
* choose target
* end turn
* attack
* use ability
* luck action

No hidden gameplay logic outside actions.

---

## Resolution Rules

Each action must follow a clear flow:

1. validate
2. apply cost
3. execute effect
4. emit events (if they exist)
5. resolve listeners

Keep resolution explicit and readable.

---

## Implementation Workflow

When adding new gameplay:

1. Add/modify content
2. Add required effects
3. Add required events (if needed)
4. Update engine minimally
5. Verify behavior via UI

---

## What NOT to Do

Agents must NOT:

* implement full game systems
* add unused features
* introduce heavy abstractions
* prematurely optimize
* build generic frameworks
* create complex pipelines

---

## Goal Reminder

The goal is:

> A minimal playable demo to validate core mechanics.

Not:

* a complete game engine
* a production-ready architecture

---

## Final Guideline

When in doubt, choose the option that is:

* simpler
* smaller
* more direct
* easier to reason about

And still aligned with:

* deterministic behavior
* clean structure
* future extensibility (without implementing it now)

And always remember:
> Less is more in a prototype. Focus on the essentials.
> Ask for clarification if unsure about requirements or scope, do not assume.
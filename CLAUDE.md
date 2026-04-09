# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CMD Hero Fights Demo is a **lean prototype** of a deterministic tactical grid-based card battle game. The goal is a minimal playable demo to validate core mechanics — not a complete game engine or production system.

## Commands

**Run the web UI (main development entry point):**
```bash
cd game/app && bun run dev
```

**Build:**
```bash
cd game/app && bun run build
```

**Lint:**
```bash
cd game/app && bun run lint
```

**Run the root entry (engine demo):**
```bash
bun run index.ts
```

> Runtime: **Bun only** — no Node.js.

## Architecture

```
game/
  engine/        # Deterministic battle engine (UI-agnostic)
    actions/     # Action handlers (play card, basic attack, end turn, etc.)
    core/        # Battle creation, RNG, luck, damage resolution, aura
    battlefield/ # Grid occupancy, adjacency, targeting, reachability
  content/       # Manually-authored runtime game content (TypeScript only)
    commander_x/ # Hero + 40+ cards (abilities, weapons, totems, companions)
  shared/        # Shared models: battle state, cards, effects, events, actions
  app/           # React 19 + Vite web UI (split-screen playtesting interface)
    src/
      App.tsx         # Main UI orchestration
      game-client.ts  # Bridges engine API → UI preview data
      components/     # Grid, hand bar, player screens, debug panel
  api.ts         # Public engine API: createBattle(), resolveAction()
  index.ts       # Root export

content/         # Read-only design reference — never import from here
```

**Data flow:** UI → `game-client.ts` → `gameApi.resolveAction()` → `resolve-action.ts` (dispatcher) → action handler → effects → listener resolution → new `BattleState` + events → `AppBattlePreview` → render.

**Key invariants:**
- Engine is completely UI-agnostic. UI calls engine only through player actions via `game/api.ts`.
- All state mutation goes through actions — no direct state mutation from outside.
- All randomness is seeded (`seedrandom`) through a single centralized RNG. Same seed + content + action sequence = identical outcome.
- `BattleState` is plain and serializable.

## Core Mechanics

**Action resolution order:** validate → apply cost → execute effect → emit events → resolve listeners.

**Luck system:** Post-RNG outcome modifier. 1 luck point = 25% outcome shift toward max (positive) or min (negative). Applied centrally in `game/engine/core/luck.ts` — never duplicated per-effect.

**Number modifier resolution order:** base → temporary modifiers (chronological) → passive rules (source position order) → finalization/clamp. Property paths use dot notation: `armor`, `dealDamage.minimum`, `basicAttack.max`.

**Hand rules:** soft cap = 4 (draw only if below this at turn start), hard cap = 7 (never exceed under any condition).

**Battlefield:** Slot-based grid with adjacency buffs, horizontal/vertical formation bonuses, square completion bonuses, reachability rules, and area target types (single/adjacent/full). Logic is centralized in `game/engine/battlefield/`.

## Content Rules

- All runtime content lives in `game/content/` and is authored manually in TypeScript.
- `content/` (root) is a read-only design reference — never import from it, never parse it, never sync from it.
- Each card declares: type, cost, targets, list of effects. No custom logic inside cards.
- When adding a card: identify effects needed → reuse existing ones → implement new ones only if none exist.
- Effects should be reusable across cards. Even unique mechanics get a parameterized effect type, not hardcoded behavior.
- Keywords only for cards that explicitly state a keyword in their effect text — not as tags.
- Events and listener types are added only when an actual mechanic requires them.

## Absolute Constraints (from AGENTS.md)

- **No tests** — no unit, integration, or test scaffolding of any kind.
- **No logging/debugging systems** — engine may be structurally loggable later, but no implementation now.
- **No overengineering** — no systems "for future use", no premature generalization, no speculative abstractions.
- **No content compilation** — no pipelines, no automated reading from `content/`, no schema bridges.

When in doubt: choose simpler, smaller, more direct. Ask for clarification rather than assuming scope.

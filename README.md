# CMD Hero Fights Demo

A minimal, deterministic battle card game prototype built to validate core game mechanics.

## Overview

CMD Hero Fights is a tactical card-based game where players deploy heroes, abilities, weapons, and totems on a grid-based battlefield. This prototype demonstrates the core mechanics through a playable web-based demo.

**By design, this is a lean prototype focused on essentials—not a production system.**

## Tech Stack

- **TypeScript** — Type-safe game engine and content
- **Bun** — Fast all-in-one JavaScript runtime
- **Seedrandom** — Deterministic randomness for reproducible games
- **Game Icons via Iconify JSON** (`@iconify-json/game-icons`) — Free/open icon set data for procedural UI iconography

## Quick Start

Install dependencies:

```bash
bun install
```

Run the demo:

```bash
bun run index.ts
```

Then open the web UI in your browser.

## Project Structure

- `game/engine/` — Core game logic and state management
- `game/content/` — Runtime game definitions (heroes, abilities, cards, effects)
- `game/app/` — Web UI for gameplay and playtesting
- `game/shared/` — Shared types and utilities
- `content/` — Reference design documentation (read-only), see [<https://github.com/nourgaser/cmd_hero_fights_data>](<https://github.com/nourgaser/cmd_hero_fights_data>)

## Design Principles

- **Action-driven** — All gameplay happens through explicit player actions
- **Deterministic** — Reproducible game state with seeded randomness
- **Minimal** — Only essential features; no over-engineering or test frameworks
- **UI-agnostic** — Engine is independent of UI layer

See [AGENTS.md](AGENTS.md) and [system-design.md](system-design.md) for architecture details.

Icon workflow reference: [game/shared/icon-workflow.md](game/shared/icon-workflow.md).

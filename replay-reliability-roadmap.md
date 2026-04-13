# Replay Reliability Roadmap

## Problem Summary

Current replay links can diverge across refresh/incognito because action transcripts still carry runtime-generated identifiers that are not guaranteed to be stable across deterministic reconstruction.

Examples of drift-prone fields:

- `useEntityActive.sourceEntityId`
- `useEntityActive.selection.targetEntityId`
- `basicAttack.selection.targetEntityId`
- `playCard.handCardId`
- `playCard.selection.targetEntityId`

This creates replay fragility and forces repair logic in the client.

## Goal

Build a chess-grade replay system where:

- Same seed + same transcript always reconstructs the same timeline.
- Replay links load reliably across browser sessions.
- Replay handling is engine-first, with a minimal client orchestration layer.

## Non-Goals

- No new testing framework work in this prototype.
- No analytics/logging platform additions.
- No large framework abstraction for future use.

## Target Architecture

### Canonical Replay Artifact

Replay payload should contain only:

- bootstrap config (including seed)
- canonical action transcript
- optional timeline pointer
- schema version

### Engine Responsibilities

- Validate replay payload schema and semantics.
- Rebuild battle deterministically from seed and transcript.
- Return precise divergence diagnostics with step index and reason.
- Own all replay normalization/repair policies (if enabled), not the UI.

### Client Responsibilities

- Read/write replay URL payload.
- Invoke engine replay reconstruction.
- Render result or error only.

## Work Plan

## Phase 1: Stabilize Current Behavior (Short-Term)

### Scope

- Keep existing replay flow but harden reliability.
- Keep deterministic repair only where needed for backward compatibility.

### Tasks

1. Centralize replay action repair in one function path.
2. Make repair deterministic and ordered (stable sorting everywhere).
3. Add strict mode toggle in replay reconstruction:
   - strict: fail on first mismatch
   - compat: deterministic repair allowed
4. Improve divergence messages to include:
   - step number
   - action kind
   - expected vs actual outcome
   - rebuilt timeline length

### Acceptance Criteria

- Existing problematic links from current branch open without crash in compat mode.
- Strict mode reports first mismatch precisely and never silently skips.

## Phase 2: Remove Drift Sources (Core Fix)

### Scope

- Eliminate dependency on unstable runtime-generated IDs in replay transcript.

### Tasks

1. Define stable replay references for entities and hand cards:
   - entity: stable summon instance reference per owner + summon ordinal (or equivalent deterministic ID)
   - hand card: stable draw-instance identity, not runtime UI ID
2. Update engine action application to resolve stable references internally.
3. Migrate replay payload to new schema version.
4. Add decode-time migration path from old versions to new format where possible.

### Acceptance Criteria

- New replays reconstruct identically in strict mode without repair.
- Cross-session replay reliability is consistent for long matches.

## Phase 3: Engine-First Replay API

### Scope

- Move replay orchestration from app session logic into engine entrypoints.

### Tasks

1. Add engine API:
   - `reconstructReplay(payload, options)`
2. Return structured replay result:
   - final state
   - snapshots/history (if requested)
   - divergence metadata
3. Keep client as a thin adapter.

### Acceptance Criteria

- Replay loop logic lives in engine package.
- Client replay module becomes primarily URL and UI glue.

## Phase 4: Compatibility and Cleanup

### Scope

- Remove temporary compatibility branches once old payload usage drops.

### Tasks

1. Deprecate old schema versions with explicit UI warning.
2. Remove legacy repair code paths not needed by latest schema.
3. Keep one clear replay policy path in engine.

### Acceptance Criteria

- No duplicated replay logic between client and engine.
- Maintenance surface is reduced and documented.

## Milestones and Sequence

1. Phase 1 complete (stability now)
2. Phase 2 complete (stable identity model)
3. Phase 3 complete (engine-first API)
4. Phase 4 complete (legacy cleanup)

## Open Decisions

1. Stable summon identity model:
   - owner + summon ordinal
   - or deterministic engine-issued UUID equivalent
2. Stable hand-card identity model:
   - draw ordinal
   - or deck-origin index + draw cycle
3. Default replay mode in production:
   - strict by default with explicit compat fallback
   - or compat by default with strict in diagnostics

## Suggested Next Working Session

1. Decide stable identity model (summon + hand card).
2. Draft new replay schema v5.
3. Implement decode migration adapter for v4 -> v5.
4. Move replay reconstruction entrypoint into engine.

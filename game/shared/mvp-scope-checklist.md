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
- [ ] Minimal app integration

## Minimal App Integration Plan

- [x] Frontend stack bootstrap (Vite + React + TypeScript)
- [x] Icon stack bootstrap (`@iconify-json/game-icons`, optional renderer package during app phase)
- [x] App imports only public game API entry (`game/index.ts`)
- [x] Split-screen layout (Player A / Player B)
- [x] Battle bootstrap UI (seed + start/reset)
- [x] Battlefield occupancy view with procedural visuals
- [x] Card/entity icon mapping via `game-icons:*` ids and visual metadata policy
- [ ] Hand and card play controls (with targeting)
- [ ] Non-card action controls (basic attack, entity active, press luck, end turn)
- [ ] Event feed and invalid-action feedback
- [ ] MVP scope guard: expose only non-low-priority prototype content
- [ ] Mark "Minimal app integration" complete

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
- [ ] Action resolution pipeline
- [ ] Effect implementations needed by included cards
- [ ] Runtime content for included cards
- [ ] Minimal app integration

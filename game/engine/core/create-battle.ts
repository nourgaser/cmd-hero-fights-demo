import {
  type BattleState,
  type BattlefieldSide,
  type CardId,
  type EntityFootprint,
  type EntityId,
  type HeroDefinition,
  type HeroEntityState,
  type Position,
  createEmptyBattlefieldOccupancy,
  footprintFits,
  footprintIsOnSide,
  rowsPerSide,
  setOccupantFootprint,
} from "../../shared/models";
import { MOVE_POINTS_CAP } from "../../shared/game-constants";
import { createBattleRng, type BattleRng } from "./rng";
import { annotateBattleStateWithActionOptions } from "../actions/annotate-action-options";
import { type ContentRegistry } from "./content-registry";

type CreateBattleHeroSetup = {
  heroEntityId: EntityId;
  heroDefinitionId: string;
  openingMovePoints: number;
  openingDeckCardIds: CardId[];
  startAnchorPosition: Position;
};

export type CreateBattleInput = {
  battleId: string;
  seed: string;
  battlefieldRows: number;
  battlefieldColumns: number;
  openingHandSize: number;
  heroes: [CreateBattleHeroSetup, CreateBattleHeroSetup];
  registry: ContentRegistry;
};

export type CreatedBattle = {
  state: BattleState;
  rng: BattleRng;
};

function createHeroEntityState(
  setup: CreateBattleHeroSetup,
  battlefieldSide: BattlefieldSide,
  hero: HeroDefinition,
): HeroEntityState {
  const openingMovePoints = Math.min(setup.openingMovePoints, MOVE_POINTS_CAP);

  return {
    kind: "hero",
    entityId: setup.heroEntityId,
    heroDefinitionId: setup.heroDefinitionId,
    battlefieldSide,
    anchorPosition: setup.startAnchorPosition,
    footprint: hero.footprint,
    maxHealth: hero.combat.maxHealth,
    currentHealth: hero.combat.maxHealth,
    armor: hero.combat.armor,
    magicResist: hero.combat.magicResist,
    attackDamage: hero.combat.attackDamage,
    abilityPower: hero.combat.abilityPower,
    criticalChance: hero.combat.criticalChance,
    criticalMultiplier: hero.combat.criticalMultiplier,
    dodgeChance: hero.combat.dodgeChance,
    maxMovePoints: openingMovePoints,
    movePoints: openingMovePoints,
    basicAttackMoveCost: hero.basicAttack.moveCost,
    deckCardIds: [...setup.openingDeckCardIds],
    handCards: [],
    discardCardIds: [],
  };
}

function shuffleCardIds(cardIds: CardId[], rng: BattleRng): CardId[] {
  const output = [...cardIds];

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.nextIntInclusive(0, index);
    const current = output[index]!;
    const swap = output[swapIndex]!;
    output[index] = swap;
    output[swapIndex] = current;
  }

  return output;
}

function drawOpeningHand(
  heroState: HeroEntityState,
  openingHandSize: number,
): HeroEntityState {
  const drawCount = Math.min(openingHandSize, heroState.deckCardIds.length);
  const drawn = heroState.deckCardIds.slice(0, drawCount);
  const remainingDeck = heroState.deckCardIds.slice(drawCount);

  return {
    ...heroState,
    deckCardIds: remainingDeck,
    handCards: drawn.map((cardDefinitionId, index) => ({
      id: `${heroState.entityId}:hand:${index + 1}`,
      cardDefinitionId,
    })),
  };
}

export function createBattle(input: CreateBattleInput): CreatedBattle {
  if (input.openingHandSize < 0) {
    throw new Error("openingHandSize must be >= 0.");
  }
  if (input.battlefieldRows <= 0 || input.battlefieldColumns <= 0) {
    throw new Error("battlefield dimensions must be positive.");
  }
  if (input.battlefieldRows % 2 !== 0) {
    throw new Error("battlefieldRows must be even so the field has two sides.");
  }

  const rng = createBattleRng(input.seed);
  const [heroASetup, heroBSetup] = input.heroes;
  const heroASide: BattlefieldSide = "north";
  const heroBSide: BattlefieldSide = "south";

  const heroADefinition = input.registry.heroesById[heroASetup.heroDefinitionId];
  const heroBDefinition = input.registry.heroesById[heroBSetup.heroDefinitionId];

  if (!heroADefinition || !heroBDefinition) {
    throw new Error("Hero definition not found in registry.");
  }

  let occupancy = createEmptyBattlefieldOccupancy({
    rows: input.battlefieldRows,
    columns: input.battlefieldColumns,
  });

  // Throws early when rows are not evenly split.
  rowsPerSide(occupancy.dimensions);

  const heroAFootprint: EntityFootprint = heroADefinition.footprint;
  const heroBFootprint: EntityFootprint = heroBDefinition.footprint;

  if (!footprintFits(occupancy, heroASetup.startAnchorPosition, heroAFootprint)) {
    throw new Error("Hero A footprint does not fit in empty battlefield cells.");
  }
  if (
    !footprintIsOnSide(
      occupancy,
      heroASetup.startAnchorPosition,
      heroAFootprint,
      heroASide,
    )
  ) {
    throw new Error("Hero A must be placed fully on the north side.");
  }

  if (!footprintFits(occupancy, heroBSetup.startAnchorPosition, heroBFootprint)) {
    throw new Error("Hero B footprint does not fit in empty battlefield cells.");
  }
  if (
    !footprintIsOnSide(
      occupancy,
      heroBSetup.startAnchorPosition,
      heroBFootprint,
      heroBSide,
    )
  ) {
    throw new Error("Hero B must be placed fully on the south side.");
  }

  occupancy = setOccupantFootprint(
    occupancy,
    heroASetup.startAnchorPosition,
    heroAFootprint,
    {
      kind: "hero",
      entityId: heroASetup.heroEntityId,
      ownerHeroEntityId: heroASetup.heroEntityId,
    },
  );
  occupancy = setOccupantFootprint(
    occupancy,
    heroBSetup.startAnchorPosition,
    heroBFootprint,
    {
      kind: "hero",
      entityId: heroBSetup.heroEntityId,
      ownerHeroEntityId: heroBSetup.heroEntityId,
    },
  );

  const heroAState = drawOpeningHand(
    createHeroEntityState(
      {
        ...heroASetup,
        openingDeckCardIds: shuffleCardIds(heroASetup.openingDeckCardIds.sort((a, b) => a.localeCompare(b)), rng),
      },
      heroASide,
      heroADefinition,
    ),
    input.openingHandSize,
  );
  const heroBState = drawOpeningHand(
    createHeroEntityState(
      {
        ...heroBSetup,
        openingDeckCardIds: shuffleCardIds(heroBSetup.openingDeckCardIds.sort((a, b) => a.localeCompare(b)), rng),
      },
      heroBSide,
      heroBDefinition,
    ),
    input.openingHandSize,
  );

  const initialListeners = [
    ...(input.registry.resolveHeroInitialListeners({
      heroDefinitionId: heroASetup.heroDefinitionId,
      heroEntityId: heroASetup.heroEntityId,
    }) ?? []),
    ...(input.registry.resolveHeroInitialListeners({
      heroDefinitionId: heroBSetup.heroDefinitionId,
      heroEntityId: heroBSetup.heroEntityId,
    }) ?? []),
  ];

  const state: BattleState = {
    battleId: input.battleId,
    seed: input.seed,
    heroEntityIds: [heroASetup.heroEntityId, heroBSetup.heroEntityId],
    luck: {
      anchorHeroEntityId: heroASetup.heroEntityId,
      balance: 0,
    },
    turn: {
      turnNumber: 1,
      activeHeroEntityId: heroASetup.heroEntityId,
      pressLuckUsedThisTurn: false,
      damageTakenThisTurnByHeroEntityId: {},
    },
    entitiesById: {
      [heroAState.entityId]: heroAState,
      [heroBState.entityId]: heroBState,
    },
    battlefieldOccupancy: occupancy,
    activeListeners: initialListeners,
    activeModifiers: [],
    activePassiveRules: [],
    activeAuras: [],
    summonCounters: {},
    drawCounters: {},
  };

  const annotatedState = annotateBattleStateWithActionOptions({
    state,
    registry: input.registry,
  });

  return {
    state: annotatedState,
    rng,
  };
}

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
import { createBattleRng, type BattleRng } from "./rng";

type CreateBattleHeroSetup = {
  heroEntityId: EntityId;
  hero: HeroDefinition;
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
};

export type CreatedBattle = {
  state: BattleState;
  rng: BattleRng;
};

function createHeroEntityState(
  setup: CreateBattleHeroSetup,
  battlefieldSide: BattlefieldSide,
): HeroEntityState {
  return {
    kind: "hero",
    entityId: setup.heroEntityId,
    heroDefinitionId: setup.hero.id,
    battlefieldSide,
    anchorPosition: setup.startAnchorPosition,
    footprint: setup.hero.footprint,
    maxHealth: setup.hero.combat.maxHealth,
    currentHealth: setup.hero.combat.maxHealth,
    armor: setup.hero.combat.armor,
    magicResist: setup.hero.combat.magicResist,
    attackDamage: setup.hero.combat.attackDamage,
    abilityPower: setup.hero.combat.abilityPower,
    criticalChance: setup.hero.combat.criticalChance,
    criticalMultiplier: setup.hero.combat.criticalMultiplier,
    dodgeChance: setup.hero.combat.dodgeChance,
    movePoints: setup.openingMovePoints,
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

  let occupancy = createEmptyBattlefieldOccupancy({
    rows: input.battlefieldRows,
    columns: input.battlefieldColumns,
  });

  // Throws early when rows are not evenly split.
  rowsPerSide(occupancy.dimensions);

  const heroAFootprint: EntityFootprint = heroASetup.hero.footprint;
  const heroBFootprint: EntityFootprint = heroBSetup.hero.footprint;

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
    ),
    input.openingHandSize,
  );

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
    },
    entitiesById: {
      [heroAState.entityId]: heroAState,
      [heroBState.entityId]: heroBState,
    },
    battlefieldOccupancy: occupancy,
  };

  return {
    state,
    rng,
  };
}

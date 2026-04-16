export type AppNumberContributionPreview = {
  sourceId: string
  label: string
  delta: number
}

export type AppNumberTrace = {
  base: number
  effective: number
  delta: number
  contributions: AppNumberContributionPreview[]
}

export type AppBattlePreview = {
  battleId: string
  seed: string
  heroEntityIds: [string, string]
  activeHeroEntityId: string
  gameOver: {
    winnerHeroEntityId: string | null
    loserHeroEntityId: string | null
    endedOnTurnNumber: number
  } | null
  turn: {
    turnNumber: number
    pressLuckUsedThisTurn: boolean
  }
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
  heroHandCounts: Array<{
    heroEntityId: string
    handSize: number
    deckSize: number
    battlefieldSide: 'north' | 'south'
    movePoints: number
    maxMovePoints: number
    moveCapacityTrace: AppNumberTrace
  }>
  heroDetailsByEntityId: Record<
    string,
    {
      heroEntityId: string
      heroDefinitionId: string
      heroName: string
      passiveText: string
      activePassiveEffects: Array<{
        effectId: string
        sourceKind: 'heroPassive' | 'aura' | 'modifier' | 'passiveRule' | 'listener'
        label: string
        iconId: string
        paletteKey: 'hero' | 'aura' | 'totem' | 'buff' | 'timed' | 'system'
        priority: number
        stackCount: number
        statusLabel: string
        statusTone: 'active' | 'pending' | 'info'
        shortText: string
        detailLines: string[]
      }>
      basicAttack: {
        moveCost: number
        damageType: 'physical' | 'magic' | 'true'
        minimumDamage: number
        maximumDamage: number
        attackDamageScaling: number
        abilityPowerScaling: number
        minimumTrace: AppNumberTrace
        maximumTrace: AppNumberTrace
        attackDamageTrace: AppNumberTrace
        attackFlatBonusDamageTrace: AppNumberTrace
        abilityPowerTrace: AppNumberTrace
        summaryText: string
        summaryDetailText: string | null
        summaryTone: 'neutral' | 'positive' | 'negative'
        currentRangeText: string
      }
    }
  >
  heroHands: Array<{
    heroEntityId: string
    cards: Array<{
      handCardId: string
      cardDefinitionId: string
      cardName: string
      moveCost: number
      cardType: 'ability' | 'weapon' | 'totem' | 'companion'
      rarity: 'common' | 'rare' | 'ultimate' | 'general'
      keywords: Array<{
        keywordId: string
        keywordName: string
        keywordSummaryText: string
      }>
      summaryText: string
      summaryDetailText: string | null
      summaryTone: 'neutral' | 'positive' | 'negative'
      castConditionText: string | null
      isPlayable: boolean
      targeting: 'none' | 'selectedAny' | 'selectedAnyExceptEnemyHero' | 'selectedEnemy' | 'selectedAlly' | 'selectedAllyCompanion'
      validTargetEntityIds: string[]
      validPlacementPositions: Array<{ row: number; column: number }>
      summonPreview: {
        cardDefinitionId: string
        entityDefinitionId: string
        entityKind: 'weapon' | 'totem' | 'companion'
        displayName: string
        cardType: 'weapon' | 'totem' | 'companion'
        rarity: 'common' | 'rare' | 'ultimate' | 'general'
        maxHealth: number
        armor: number
        magicResist: number
        attackDamage: number
        abilityPower: number
        maxMovesPerTurn: number
        passiveSummaryText: string | null
        passiveSummaryDetailText: string | null
        activeAbilitySummaryText: string | null
        activeAbilitySummaryDetailText: string | null
      } | null
    }>
  }>
  heroActionTargets: Array<{
    heroEntityId: string
    basicAttack: {
      attackerEntityId: string
      moveCost: number
      validTargetEntityIds: string[]
    }
    pressLuck: {
      moveCost: number
    }
    entityActive: Array<{
      sourceEntityId: string
      validTargetEntityIds: string[]
    }>
  }>
  battlefield: {
    rows: number
    columns: number
    cells: Array<{
      row: number
      column: number
      occupantKind: 'hero' | 'weapon' | 'totem' | 'companion' | null
      ownerHeroEntityId: string | null
      entityId: string | null
    }>
    entitiesById: Record<
      string,
      {
        entityId: string
        kind: 'hero' | 'weapon' | 'totem' | 'companion'
        ownerHeroEntityId: string
        displayName: string
        sourceCardDefinitionId: string | null
        sourceCardName: string | null
        sourceCardSummary: string | null
        sourceCardSummaryDetailText: string | null
        sourceCardSummaryTone: 'neutral' | 'positive' | 'negative'
        sourceCardKeywords: Array<{
          keywordId: string
          keywordName: string
          keywordSummaryText: string
        }>
        activeListeners: Array<{
          listenerId: string
          label: string
          shortText: string
          statusLabel: string
        }>
        isTaunt: boolean
        currentHealth: number
        maxHealth: number
        armor: number
        magicResist: number
        attackDamage: number
        abilityPower: number
        isImmune: boolean
        statLayers: {
          armor: { permanent: number; bonus: number }
          magicResist: { permanent: number; bonus: number }
          attackDamage: { permanent: number; bonus: number }
          abilityPower: { permanent: number; bonus: number }
          attackFlatBonusDamage: { permanent: number; bonus: number }
          moveCapacity: { permanent: number; bonus: number }
        }
        combatNumbers: {
          armor: AppNumberTrace
          magicResist: AppNumberTrace
          attackDamage: AppNumberTrace
          attackFlatBonusDamage: AppNumberTrace
          abilityPower: AppNumberTrace
          immune: AppNumberTrace
          dodgeChance: AppNumberTrace
          moveCapacity: AppNumberTrace
        }
        criticalChance: number
        effectiveCriticalChance: number
        criticalChanceLuckDelta: number
        criticalMultiplier: number
        dodgeChance: number
        effectiveDodgeChance: number
        dodgeChanceLuckDelta: number
        movePoints: number
        maxMovePoints: number
        activeAbility?: {
          moveCost: number
          damageType: 'physical' | 'magic' | 'true'
          canBeDodged: boolean
          summaryText: string
          summaryDetailText: string | null
          summaryTone: 'neutral' | 'positive' | 'negative'
          currentRangeText: string
        }
      }
    >
  }
}

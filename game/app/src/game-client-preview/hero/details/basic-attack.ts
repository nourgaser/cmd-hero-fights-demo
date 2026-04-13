import {
  buildHeroBasicAttackSummary,
  combineNumberTraces,
  resolveNumberTrace,
} from '../../helpers.ts'
import type { PreviewBattleState, PreviewGameApi, HeroEntity } from './types.ts'

export function buildHeroBasicAttackContext(options: {
  gameApi: PreviewGameApi
  state: PreviewBattleState
  entity: HeroEntity
  heroDef: (PreviewGameApi['heroesById'])[keyof PreviewGameApi['heroesById']]
}) {
  const { gameApi, state, entity, heroDef } = options

  const basicAttack = buildHeroBasicAttackSummary({
    heroName: heroDef.name,
    rollingHeroEntityId: entity.entityId,
    attack: heroDef.basicAttack,
    minimumTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'basicAttack.minimum',
      baseValue: heroDef.basicAttack.minimumDamage,
      clampMin: 0,
    }),
    maximumTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'basicAttack.maximum',
      baseValue: heroDef.basicAttack.maximumDamage,
      clampMin: 0,
    }),
    attackDamageTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackDamage',
      baseValue: entity.attackDamage,
      clampMin: 0,
    }),
    attackFlatBonusDamageTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackFlatBonusDamage',
      baseValue: 0,
    }),
    abilityPowerTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'abilityPower',
      baseValue: entity.abilityPower,
      clampMin: 0,
    }),
    luck: state.luck,
  })

  const basicAttackFlatBonusDamageTrace = combineNumberTraces(
    basicAttack.attackFlatBonusDamageTrace,
    resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackFlatBonusDamage',
      baseValue: 0,
    }),
  )

  const basicAttackWithCombinedFlatBonus = buildHeroBasicAttackSummary({
    heroName: heroDef.name,
    rollingHeroEntityId: entity.entityId,
    attack: heroDef.basicAttack,
    minimumTrace: basicAttack.minimumTrace,
    maximumTrace: basicAttack.maximumTrace,
    attackDamageTrace: basicAttack.attackDamageTrace,
    attackFlatBonusDamageTrace: basicAttackFlatBonusDamageTrace,
    abilityPowerTrace: resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'abilityPower',
      baseValue: entity.abilityPower,
      clampMin: 0,
    }),
    luck: state.luck,
  })

  const heroArmorTrace = resolveNumberTrace({
    gameApi,
    state,
    targetEntityId: entity.entityId,
    propertyPath: 'armor',
    baseValue: entity.armor,
    clampMin: 0,
  })
  const heroMagicResistTrace = resolveNumberTrace({
    gameApi,
    state,
    targetEntityId: entity.entityId,
    propertyPath: 'magicResist',
    baseValue: entity.magicResist,
    clampMin: 0,
  })

  const contributionSourceIds = new Set(
    [
      ...heroArmorTrace.contributions,
      ...heroMagicResistTrace.contributions,
      ...basicAttack.attackDamageTrace.contributions,
      ...basicAttack.abilityPowerTrace.contributions,
      ...basicAttack.attackFlatBonusDamageTrace.contributions,
    ].map((contribution) => contribution.sourceId),
  )

  return {
    basicAttackWithCombinedFlatBonus,
    contributionSourceIds,
  }
}

import { createGameApi } from '../../../../../index'
import type { AppBattlePreview } from '../../types'

export type PreviewGameApi = ReturnType<typeof createGameApi>
export type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']
export type HeroEntity = Extract<PreviewBattleState['entitiesById'][string], { kind: 'hero' }>
export type HeroPassiveEffect = AppBattlePreview['heroDetailsByEntityId'][string]['activePassiveEffects'][number]

export type AuraGroup = {
  auraKind: string
  label: string
  stackCount: number
  turnsUntilAmplifiedEnds: number
  isAmplified: boolean
  baseResistanceBonus: number
  amplifiedResistanceBonus: number
  currentResistanceBonus: number
  triggeredThisTurn: boolean
  instances: Array<{
    auraId: string
    turnsRemaining: number
    expiresOnTurnNumber: number
  }>
}

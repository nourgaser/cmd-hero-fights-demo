import type { AppBattlePreview } from '../../types'
import type { AppBattleApi } from '../../../game-client'
import type { BattleState, HeroEntityState } from '../../../../../shared/models'

export type PreviewGameApi = AppBattleApi
export type PreviewBattleState = BattleState
export type HeroEntity = HeroEntityState
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

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react/offline'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import { Rnd } from 'react-rnd'
import { toast } from 'react-hot-toast'
import 'react-json-view-lite/dist/index.css'
import type { GameBootstrapConfig } from '../data/game-bootstrap.ts'
import { CARD_ICON_META } from '../data/visual-metadata.ts'

type SettingsPanelProps = {
  state: Record<string, unknown> | unknown[]
  bootstrapConfig: GameBootstrapConfig
  deckEditorCards: Array<{
    id: string
    name: string
    moveCost: number
    type: 'ability' | 'weapon' | 'totem' | 'companion'
    rarity: 'common' | 'rare' | 'ultimate' | 'general'
    heroId?: string
    summaryText: string | null
    effectTexts: string[]
    castConditionText: string | null
    keywords: Array<{
      id: string
      name: string
      summaryText: string
    }>
  }>
  seed: string
  isDeckEditorOpen: boolean
  deckEditorHeroIndex: 0 | 1
  onSeedChange: (seed: string) => void
  onBootstrapConfigChange: (config: GameBootstrapConfig) => boolean
  onCloseDeckEditor: () => void
  onHardReset: () => void
  onClosePanel?: () => void
}

const SETTINGS_PANEL_STORAGE_KEY = 'cmd-hero:settings-panel-state'
const DEFAULT_LAYOUT = { x: 12, y: 12, width: 360, height: 560 }
const MAX_DECK_SIZE = 15
const MAX_ULTIMATE_COPIES = 1
const DECK_SAVE_TOAST_ID = 'deck-editor-save'

type DeckTypeFilter = 'all' | 'ability' | 'weapon' | 'totem' | 'companion'

type DeckRarityFilter = 'all' | 'common' | 'rare' | 'ultimate' | 'general'

const DECK_COST_FILTERS = ['all', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'] as const
type DeckCostFilter = (typeof DECK_COST_FILTERS)[number]
type DeckCostBucket = Exclude<DeckCostFilter, 'all'>

const TYPE_FILTER_OPTIONS: Array<{ value: DeckTypeFilter; label: string; icon: string }> = [
  { value: 'all', label: 'All Types', icon: 'game-icons:card-pick' },
  { value: 'ability', label: 'Ability', icon: 'game-icons:skills' },
  { value: 'weapon', label: 'Weapon', icon: 'game-icons:broadsword' },
  { value: 'totem', label: 'Totem', icon: 'game-icons:stone-tower' },
  { value: 'companion', label: 'Companion', icon: 'game-icons:team-upgrade' },
]

const RARITY_FILTER_OPTIONS: Array<{ value: DeckRarityFilter; label: string; icon: string }> = [
  { value: 'all', label: 'All Rarities', icon: 'game-icons:asterisk' },
  { value: 'common', label: 'Common', icon: 'game-icons:plain-circle' },
  { value: 'rare', label: 'Rare', icon: 'game-icons:sparkles' },
  { value: 'ultimate', label: 'Ultimate', icon: 'game-icons:queen-crown' },
  { value: 'general', label: 'General', icon: 'game-icons:checked-shield' },
]


type SettingsPanelPersistedState = {
  x: number
  y: number
  width: number
  height: number
  isCollapsed: boolean
  expandAll: boolean
}

type SavedDeck = {
  id: string
  name: string
  heroDefinitionId: string
  cardIds: string[]
  savedAt: number
}

const SAVED_DECKS_STORAGE_KEY = 'cmd-hero:saved-decks'

const loadSavedDecks = (): SavedDeck[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(SAVED_DECKS_STORAGE_KEY)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as SavedDeck[]
  } catch {
    return []
  }
}

const persistSavedDecks = (decks: SavedDeck[]) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(decks))
}

const clamp = (value: number, min: number, max: number) => {
  if (max < min) {
    return min
  }
  return Math.min(Math.max(value, min), max)
}

const getVisualIconStyle = (meta: { rotate?: number; hFlip?: boolean; vFlip?: boolean }) => {
  const transforms: string[] = []
  if (meta.hFlip) {
    transforms.push('scaleX(-1)')
  }
  if (meta.vFlip) {
    transforms.push('scaleY(-1)')
  }
  if (typeof meta.rotate === 'number' && meta.rotate !== 0) {
    transforms.push(`rotate(${meta.rotate}deg)`)
  }
  return transforms.length > 0 ? { transform: transforms.join(' ') } : undefined
}

const sanitizePersistedState = (state: SettingsPanelPersistedState): SettingsPanelPersistedState => {
  if (typeof window === 'undefined') {
    return state
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const minPanelWidth = 300
  const minPanelHeight = 220

  const width = clamp(state.width, minPanelWidth, Math.max(minPanelWidth, viewportWidth))
  const height = clamp(state.height, minPanelHeight, Math.max(minPanelHeight, viewportHeight))

  return {
    ...state,
    width,
    height,
    x: clamp(state.x, 0, viewportWidth - width),
    y: clamp(state.y, 0, viewportHeight - height),
  }
}

const loadPersistedState = (): SettingsPanelPersistedState => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }

  const saved = window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEY)
  if (!saved) {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }

  try {
    const parsed = JSON.parse(saved) as Partial<SettingsPanelPersistedState>
    return sanitizePersistedState({
      x: typeof parsed.x === 'number' ? parsed.x : DEFAULT_LAYOUT.x,
      y: typeof parsed.y === 'number' ? parsed.y : DEFAULT_LAYOUT.y,
      width: typeof parsed.width === 'number' ? parsed.width : DEFAULT_LAYOUT.width,
      height: typeof parsed.height === 'number' ? parsed.height : DEFAULT_LAYOUT.height,
      isCollapsed: typeof parsed.isCollapsed === 'boolean' ? parsed.isCollapsed : false,
      expandAll: typeof parsed.expandAll === 'boolean' ? parsed.expandAll : false,
    })
  } catch {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }
}

const persistState = (state: SettingsPanelPersistedState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, JSON.stringify(state))
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { state, bootstrapConfig, deckEditorCards, seed, isDeckEditorOpen, deckEditorHeroIndex, onSeedChange, onBootstrapConfigChange, onCloseDeckEditor, onHardReset, onClosePanel } = props
  const [persistedState, setPersistedState] = useState<SettingsPanelPersistedState>(() => loadPersistedState())
  const [draftSeed, setDraftSeed] = useState(seed)
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form')
  const [draftBootstrapConfig, setDraftBootstrapConfig] = useState<GameBootstrapConfig>(bootstrapConfig)
  const [draftBootstrapConfigText, setDraftBootstrapConfigText] = useState(
    () => JSON.stringify(bootstrapConfig, null, 2),
  )
  const [bootstrapConfigError, setBootstrapConfigError] = useState<string | null>(null)
  const [deckSearch, setDeckSearch] = useState('')
  const [deckTypeFilter, setDeckTypeFilter] = useState<DeckTypeFilter>('all')
  const [deckRarityFilter, setDeckRarityFilter] = useState<DeckRarityFilter>('all')
  const [deckCostFilter, setDeckCostFilter] = useState<DeckCostFilter>('all')
  const [selectedDeckCardId, setSelectedDeckCardId] = useState<string | null>(null)
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>(() => loadSavedDecks())
  const [isSavedDecksOpen, setIsSavedDecksOpen] = useState(false)
  const [savedDecksNewName, setSavedDecksNewName] = useState('')
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null)
  const [editingDeckName, setEditingDeckName] = useState('')

  const { x, y, width, height, expandAll } = persistedState

  const copiedState = useMemo(() => JSON.stringify(state, null, 2), [state])

  useEffect(() => {
    setDraftSeed(seed)
  }, [seed])

  useEffect(() => {
    setDraftBootstrapConfig(bootstrapConfig)
    setDraftBootstrapConfigText(JSON.stringify(bootstrapConfig, null, 2))
    setBootstrapConfigError(null)
  }, [bootstrapConfig])

  useEffect(() => {
    if (editorMode === 'json') {
      setDraftBootstrapConfigText(JSON.stringify(draftBootstrapConfig, null, 2))
    }
  }, [draftBootstrapConfig, editorMode])

  useEffect(() => {
    if (!isDeckEditorOpen) {
      setIsSavedDecksOpen(false)
    }
  }, [isDeckEditorOpen])

  useEffect(() => {
    if (isDeckEditorOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isDeckEditorOpen])

  useEffect(() => {
    if (!isDeckEditorOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isSavedDecksOpen) {
          setIsSavedDecksOpen(false)
        } else {
          onCloseDeckEditor()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDeckEditorOpen, isSavedDecksOpen, onCloseDeckEditor])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleResize = () => {
      setPersistedState((current) => {
        const next = sanitizePersistedState(current)
        if (
          next.x === current.x
          && next.y === current.y
          && next.width === current.width
          && next.height === current.height
        ) {
          return current
        }

        persistState(next)
        return next
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const updateState = (updater: (current: SettingsPanelPersistedState) => SettingsPanelPersistedState) => {
    setPersistedState((current) => {
      const next = sanitizePersistedState(updater(current))
      persistState(next)
      return next
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copiedState)
    } catch {
      // No-op in prototype if clipboard is unavailable.
    }
  }

  const handleSeedApply = () => {
    onSeedChange(draftSeed.trim())
  }

  const handleBootstrapConfigApply = () => {
    if (editorMode === 'json') {
      try {
        const parsed = JSON.parse(draftBootstrapConfigText) as GameBootstrapConfig
        setDraftBootstrapConfig(parsed)
        const saved = onBootstrapConfigChange(parsed)
        if (saved) {
          toast.success('Bootstrap config saved.', { id: DECK_SAVE_TOAST_ID })
        }
        setBootstrapConfigError(null)
      } catch (error) {
        setBootstrapConfigError(error instanceof Error ? error.message : 'Invalid bootstrap JSON.')
        toast.error('Bootstrap config JSON is invalid.', { id: DECK_SAVE_TOAST_ID })
      }
      return
    }

    const saved = onBootstrapConfigChange(draftBootstrapConfig)
    if (saved) {
      toast.success('Bootstrap config saved.', { id: DECK_SAVE_TOAST_ID })
    }
    setBootstrapConfigError(null)
  }

  const handleModeToggle = () => {
    if (editorMode === 'form') {
      setDraftBootstrapConfigText(JSON.stringify(draftBootstrapConfig, null, 2))
      setEditorMode('json')
      setBootstrapConfigError(null)
      return
    }

    setEditorMode('form')
    setBootstrapConfigError(null)
  }

  const updateDraftBootstrapConfig = (updater: (current: GameBootstrapConfig) => GameBootstrapConfig) => {
    setDraftBootstrapConfig((current) => updater(current))
  }

  const updateHeroDraft = (
    heroIndex: 0 | 1,
    updater: (current: GameBootstrapConfig['heroes'][number]) => GameBootstrapConfig['heroes'][number],
  ) => {
    updateDraftBootstrapConfig((current) => {
      const nextHeroes = [...current.heroes] as GameBootstrapConfig['heroes']
      nextHeroes[heroIndex] = updater(nextHeroes[heroIndex])
      return {
        ...current,
        heroes: nextHeroes,
      }
    })
  }

  const handleDeckListChange = (heroIndex: 0 | 1, rawValue: string) => {
    const nextDeckCardIds = rawValue
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)

    updateHeroDraft(heroIndex, (current) => ({
      ...current,
      openingDeckCardIds: nextDeckCardIds,
    }))
  }

  const deckEditorHero = draftBootstrapConfig.heroes[deckEditorHeroIndex]
  const eligibleDeckEditorCards = useMemo(() => {
    return deckEditorCards
      .filter((card) => !card.heroId || card.heroId === deckEditorHero.heroDefinitionId)
      .sort((left, right) => {
        if (left.moveCost !== right.moveCost) {
          return left.moveCost - right.moveCost
        }
        return left.name.localeCompare(right.name)
      })
  }, [deckEditorCards, deckEditorHero.heroDefinitionId])

  const deckCountsByCardId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cardId of deckEditorHero.openingDeckCardIds) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1)
    }
    return counts
  }, [deckEditorHero.openingDeckCardIds])

  const totalUltimateCopiesInDeck = useMemo(() => {
    return eligibleDeckEditorCards.reduce((sum, card) => {
      if (card.rarity !== 'ultimate') {
        return sum
      }
      return sum + (deckCountsByCardId.get(card.id) ?? 0)
    }, 0)
  }, [eligibleDeckEditorCards, deckCountsByCardId])

  const getMaxCopiesForCard = (rarity: 'common' | 'rare' | 'ultimate' | 'general') => {
    return rarity === 'ultimate' ? 1 : 2
  }

  const getCardTypeLabel = (type: 'ability' | 'weapon' | 'totem' | 'companion') => {
    switch (type) {
      case 'ability':
        return 'Ability'
      case 'weapon':
        return 'Weapon'
      case 'totem':
        return 'Totem'
      case 'companion':
        return 'Companion'
      default:
        return 'Card'
    }
  }

  const getCardIconMeta = (cardId: string) => {
    return CARD_ICON_META[cardId] ?? { id: 'game-icons:card-pick' }
  }

  const deckEditorRows = eligibleDeckEditorCards.map((card) => {
    const inDeck = deckCountsByCardId.get(card.id) ?? 0
    const maxCopies = getMaxCopiesForCard(card.rarity)
    const inPool = Math.max(0, maxCopies - inDeck)
    return {
      card,
      inDeck,
      inPool,
      maxCopies,
    }
  })

  const deckRows = deckEditorRows.filter((entry) => entry.inDeck > 0)
  const deckRowsSorted = useMemo(() => {
    return [...deckRows].sort((left, right) => {
      if (left.card.moveCost !== right.card.moveCost) {
        return left.card.moveCost - right.card.moveCost
      }
      return left.card.name.localeCompare(right.card.name)
    })
  }, [deckRows])

  const manaCurve = useMemo(() => {
    const curveEntries = DECK_COST_FILTERS
      .filter((entry): entry is DeckCostBucket => entry !== 'all')
      .map((costBucket) => ({
        costBucket,
        count: 0,
      }))

    const curveByBucket = new Map(curveEntries.map((entry) => [entry.costBucket, entry]))

    for (const entry of deckRowsSorted) {
      const bucket: DeckCostBucket = entry.card.moveCost >= 10 ? '10+' : `${entry.card.moveCost}` as DeckCostBucket
      const target = curveByBucket.get(bucket)
      if (target) {
        target.count += entry.inDeck
      }
    }

    const maxCount = curveEntries.reduce((max, entry) => Math.max(max, entry.count), 1)

    return {
      maxCount,
      entries: curveEntries,
    }
  }, [deckRowsSorted])

  const deckRowsByCostBucket = useMemo(() => {
    return DECK_COST_FILTERS
      .filter((entry): entry is DeckCostBucket => entry !== 'all')
      .map((costBucket) => ({
        costBucket,
        entries: deckRowsSorted.filter((row) => {
          if (costBucket === '10+') {
            return row.card.moveCost >= 10
          }
          return row.card.moveCost === Number.parseInt(costBucket, 10)
        }),
      }))
      .filter((group) => group.entries.length > 0)
  }, [deckRowsSorted])

  const filteredDeckEditorRows = useMemo(() => {
    const normalizedSearch = deckSearch.trim().toLowerCase()

    const matchesCostFilter = (moveCost: number) => {
      if (deckCostFilter === 'all') {
        return true
      }
      if (deckCostFilter === '10+') {
        return moveCost >= 10
      }
      return moveCost === Number.parseInt(deckCostFilter, 10)
    }

    return deckEditorRows.filter((entry) => {
      if (deckTypeFilter !== 'all' && entry.card.type !== deckTypeFilter) {
        return false
      }
      if (deckRarityFilter !== 'all' && entry.card.rarity !== deckRarityFilter) {
        return false
      }
      if (!matchesCostFilter(entry.card.moveCost)) {
        return false
      }
      if (!normalizedSearch) {
        return true
      }

      const searchableText = [
        entry.card.name,
        entry.card.summaryText ?? '',
        entry.card.effectTexts.join(' '),
        entry.card.keywords.map((keyword) => keyword.name).join(' '),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedSearch)
    })
  }, [deckEditorRows, deckSearch, deckTypeFilter, deckRarityFilter, deckCostFilter])

  useEffect(() => {
    const stillVisible = selectedDeckCardId
      ? filteredDeckEditorRows.some((entry) => entry.card.id === selectedDeckCardId)
      : false

    if (stillVisible) {
      return
    }

    setSelectedDeckCardId(filteredDeckEditorRows[0]?.card.id ?? null)
  }, [selectedDeckCardId, filteredDeckEditorRows])

  const selectedDeckCardEntry = useMemo(() => {
    if (selectedDeckCardId) {
      return deckEditorRows.find((entry) => entry.card.id === selectedDeckCardId) ?? null
    }
    return filteredDeckEditorRows[0] ?? null
  }, [selectedDeckCardId, deckEditorRows, filteredDeckEditorRows])

  const addDeckCopy = (cardId: string) => {
    const cardEntry = deckEditorRows.find((entry) => entry.card.id === cardId)
    if (!cardEntry || cardEntry.inPool <= 0) {
      return
    }

    if (deckEditorHero.openingDeckCardIds.length >= MAX_DECK_SIZE) {
      return
    }

    if (cardEntry.card.rarity === 'ultimate' && totalUltimateCopiesInDeck >= MAX_ULTIMATE_COPIES) {
      return
    }

    updateHeroDraft(deckEditorHeroIndex, (current) => ({
      ...current,
      openingDeckCardIds: [...current.openingDeckCardIds, cardEntry.card.id],
    }))
  }

  const removeDeckCopy = (cardId: string) => {
    updateHeroDraft(deckEditorHeroIndex, (current) => {
      const removeIndex = current.openingDeckCardIds.findIndex((entry) => entry === cardId)
      if (removeIndex < 0) {
        return current
      }

      const nextDeck = [...current.openingDeckCardIds]
      nextDeck.splice(removeIndex, 1)
      return {
        ...current,
        openingDeckCardIds: nextDeck,
      }
    })
  }

  const currentHeroSavedDecks = savedDecks.filter(
    (deck) => deck.heroDefinitionId === deckEditorHero.heroDefinitionId,
  )

  const handleSaveAsNew = () => {
    const name = savedDecksNewName.trim()
    if (!name) {
      return
    }

    if (deckEditorHero.openingDeckCardIds.length !== MAX_DECK_SIZE) {
      toast.error(`Deck must be ${MAX_DECK_SIZE} cards to save.`, { id: DECK_SAVE_TOAST_ID })
      return
    }

    const newDeck: SavedDeck = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      heroDefinitionId: deckEditorHero.heroDefinitionId,
      cardIds: [...deckEditorHero.openingDeckCardIds],
      savedAt: Date.now(),
    }

    const next = [...savedDecks, newDeck]
    setSavedDecks(next)
    persistSavedDecks(next)
    setSavedDecksNewName('')
    toast.success(`Deck "${name}" saved.`, { id: DECK_SAVE_TOAST_ID })
  }

  const handleSaveOverwrite = (deckId: string) => {
    if (deckEditorHero.openingDeckCardIds.length !== MAX_DECK_SIZE) {
      toast.error(`Deck must be ${MAX_DECK_SIZE} cards to overwrite.`, { id: DECK_SAVE_TOAST_ID })
      return
    }

    const target = savedDecks.find((d) => d.id === deckId)
    if (!target) {
      return
    }

    const next = savedDecks.map((deck) =>
      deck.id === deckId
        ? { ...deck, cardIds: [...deckEditorHero.openingDeckCardIds], savedAt: Date.now() }
        : deck,
    )
    setSavedDecks(next)
    persistSavedDecks(next)
    toast.success(`Deck "${target.name}" overwritten.`, { id: DECK_SAVE_TOAST_ID })
  }

  const handleLoadDeck = (deck: SavedDeck) => {
    updateHeroDraft(deckEditorHeroIndex, (current) => ({
      ...current,
      openingDeckCardIds: [...deck.cardIds],
    }))
    setIsSavedDecksOpen(false)
    toast.success(`Deck "${deck.name}" loaded.`, { id: DECK_SAVE_TOAST_ID })
  }

  const handleDeleteSavedDeck = (deckId: string) => {
    const next = savedDecks.filter((d) => d.id !== deckId)
    setSavedDecks(next)
    persistSavedDecks(next)
    if (editingDeckId === deckId) {
      setEditingDeckId(null)
      setEditingDeckName('')
    }
  }

  const handleStartRename = (deck: SavedDeck) => {
    setEditingDeckId(deck.id)
    setEditingDeckName(deck.name)
  }

  const handleConfirmRename = () => {
    if (!editingDeckId) {
      return
    }
    const name = editingDeckName.trim()
    if (!name) {
      return
    }

    const next = savedDecks.map((deck) =>
      deck.id === editingDeckId ? { ...deck, name } : deck,
    )
    setSavedDecks(next)
    persistSavedDecks(next)
    setEditingDeckId(null)
    setEditingDeckName('')
  }

  const handleCancelRename = () => {
    setEditingDeckId(null)
    setEditingDeckName('')
  }

  const saveDeckFromModal = () => {
    if (deckEditorHero.openingDeckCardIds.length !== MAX_DECK_SIZE) {
      toast.error(`Deck must contain exactly ${MAX_DECK_SIZE} cards before saving.`, { id: DECK_SAVE_TOAST_ID })
      return
    }

    if (totalUltimateCopiesInDeck > MAX_ULTIMATE_COPIES) {
      toast.error(`Deck can contain only ${MAX_ULTIMATE_COPIES} ultimate card.`, { id: DECK_SAVE_TOAST_ID })
      return
    }

    const saved = onBootstrapConfigChange(draftBootstrapConfig)
    if (!saved) {
      return
    }

    toast.success('Deck saved. Battle restarted with updated deck.', { id: DECK_SAVE_TOAST_ID })
    onCloseDeckEditor()
  }

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      minWidth={300}
      minHeight={220}
      bounds="window"
      dragHandleClassName="settings-panel-header"
      cancel=".settings-panel-actions, .settings-panel-actions *"
      enableResizing
      className="settings-panel"
      onDragStop={(_event, data) => {
        updateState((current) => ({ ...current, x: data.x, y: data.y }))
      }}
      onResizeStop={(_event, _direction, ref, _delta, position) => {
        updateState((current) => ({
          ...current,
          x: position.x,
          y: position.y,
          width: Number.parseFloat(ref.style.width),
          height: Number.parseFloat(ref.style.height),
        }))
      }}
    >
      <aside aria-label="Settings panel">
          <header className="settings-panel-header">
            <strong>Settings</strong>
            <div className="settings-panel-actions">
              <button
                type="button"
                onClick={() => updateState((current) => ({ ...current, expandAll: !current.expandAll }))}
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>
              <button type="button" onClick={handleCopy}>
                Copy JSON
              </button>
              <button type="button" onClick={onHardReset}>
                Hard Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClosePanel) {
                    onClosePanel()
                    return
                  }
                }}
              >
                Close
              </button>
            </div>
          </header>

          <div className="settings-tree-wrap">
            <div className="settings-seed-panel">
              <label className="settings-seed-field">
                <span>Seed</span>
                <input
                  type="text"
                  value={draftSeed}
                  onChange={(event) => setDraftSeed(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSeedApply()
                    }
                  }}
                />
              </label>
              <button type="button" onClick={handleSeedApply}>
                Apply Seed
              </button>
            </div>
            <div className="settings-bootstrap-panel">
              <div className="settings-bootstrap-header">
                <strong>Bootstrap Config</strong>
                <span>Use the form for small changes. Switch to JSON when needed.</span>
              </div>
              <button type="button" onClick={handleModeToggle}>
                {editorMode === 'form' ? 'Edit as JSON' : 'Use Form'}
              </button>
              {editorMode === 'json' ? (
                <>
                  <textarea
                    className="settings-bootstrap-textarea"
                    value={draftBootstrapConfigText}
                    onChange={(event) => setDraftBootstrapConfigText(event.target.value)}
                    spellCheck={false}
                  />
                  {bootstrapConfigError ? <p className="settings-bootstrap-error">{bootstrapConfigError}</p> : null}
                </>
              ) : (
                <div className="settings-bootstrap-form">
                  <label className="settings-bootstrap-field">
                    <span>Battle ID</span>
                    <input
                      type="text"
                      value={draftBootstrapConfig.battleId}
                      onChange={(event) => {
                        const battleId = event.target.value
                        updateDraftBootstrapConfig((current) => ({ ...current, battleId }))
                      }}
                    />
                  </label>
                  <label className="settings-bootstrap-field">
                    <span>Battlefield Rows</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draftBootstrapConfig.battlefieldRows}
                      onChange={(event) => {
                        const battlefieldRows = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(battlefieldRows)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, battlefieldRows }))
                        }
                      }}
                    />
                  </label>
                  <label className="settings-bootstrap-field">
                    <span>Battlefield Columns</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draftBootstrapConfig.battlefieldColumns}
                      onChange={(event) => {
                        const battlefieldColumns = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(battlefieldColumns)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, battlefieldColumns }))
                        }
                      }}
                    />
                  </label>
                  <label className="settings-bootstrap-field">
                    <span>Opening Hand Size</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftBootstrapConfig.openingHandSize}
                      onChange={(event) => {
                        const openingHandSize = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(openingHandSize)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, openingHandSize }))
                        }
                      }}
                    />
                  </label>

                  {draftBootstrapConfig.heroes.map((hero, heroIndex) => (
                    <div className="settings-bootstrap-hero" key={hero.heroEntityId}>
                      <strong>Hero {heroIndex + 1}</strong>
                      <label className="settings-bootstrap-field">
                        <span>Hero Entity ID</span>
                        <input
                          type="text"
                          value={hero.heroEntityId}
                          onChange={(event) => {
                            const heroEntityId = event.target.value
                            updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, heroEntityId }))
                          }}
                        />
                      </label>
                      <label className="settings-bootstrap-field">
                        <span>Hero Definition ID</span>
                        <input
                          type="text"
                          value={hero.heroDefinitionId}
                          onChange={(event) => {
                            const heroDefinitionId = event.target.value
                            updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, heroDefinitionId }))
                          }}
                        />
                      </label>
                      <label className="settings-bootstrap-field">
                        <span>Opening Move Points</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={hero.openingMovePoints}
                          onChange={(event) => {
                            const openingMovePoints = Number.parseInt(event.target.value, 10)
                            if (Number.isFinite(openingMovePoints)) {
                              updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, openingMovePoints }))
                            }
                          }}
                        />
                      </label>
                      <div className="settings-bootstrap-grid">
                        <label className="settings-bootstrap-field">
                          <span>Start Row</span>
                          <input
                            type="number"
                            step={1}
                            value={hero.startAnchorPosition.row}
                            onChange={(event) => {
                              const row = Number.parseInt(event.target.value, 10)
                              if (Number.isFinite(row)) {
                                updateHeroDraft(heroIndex as 0 | 1, (current) => ({
                                  ...current,
                                  startAnchorPosition: {
                                    ...current.startAnchorPosition,
                                    row,
                                  },
                                }))
                              }
                            }}
                          />
                        </label>
                        <label className="settings-bootstrap-field">
                          <span>Start Column</span>
                          <input
                            type="number"
                            step={1}
                            value={hero.startAnchorPosition.column}
                            onChange={(event) => {
                              const column = Number.parseInt(event.target.value, 10)
                              if (Number.isFinite(column)) {
                                updateHeroDraft(heroIndex as 0 | 1, (current) => ({
                                  ...current,
                                  startAnchorPosition: {
                                    ...current.startAnchorPosition,
                                    column,
                                  },
                                }))
                              }
                            }}
                          />
                        </label>
                      </div>
                      <label className="settings-bootstrap-field">
                        <span>Opening Deck Card IDs</span>
                        <textarea
                          className="settings-bootstrap-textarea settings-bootstrap-textarea-small"
                          value={hero.openingDeckCardIds.join('\n')}
                          onChange={(event) => handleDeckListChange(heroIndex as 0 | 1, event.target.value)}
                          spellCheck={false}
                        />
                      </label>
                    </div>
                  ))}

                  <button type="button" onClick={handleBootstrapConfigApply}>
                    Apply Bootstrap Config
                  </button>
                </div>
              )}
              {bootstrapConfigError ? <p className="settings-bootstrap-error">{bootstrapConfigError}</p> : null}
            </div>
            <JsonView
              data={state}
              style={defaultStyles}
              shouldExpandNode={
                expandAll
                  ? allExpanded
                  : (level) => level < 2
              }
            />
          </div>
        </aside>

      {isDeckEditorOpen && typeof document !== 'undefined'
        ? createPortal(
          <div className="deck-editor-modal" role="dialog" aria-modal="true" aria-label="Deck editor">
          <div className="deck-editor-modal-header">
            <div className="deck-editor-title-wrap">
              <strong>Deck Editor — {deckEditorHeroIndex === 0 ? 'Player A' : 'Player B'}</strong>
              <span>
                {deckEditorHero.openingDeckCardIds.length}/{MAX_DECK_SIZE} cards
              </span>
            </div>
            <div className="deck-editor-header-actions">
              <button
                type="button"
                className="deck-editor-saved-decks-btn"
                onClick={() => setIsSavedDecksOpen(true)}
              >
                Saved Decks
              </button>
              <button type="button" className="deck-editor-save" onClick={saveDeckFromModal}>
                Apply &amp; Restart
              </button>
              <button type="button" className="deck-editor-close" onClick={onCloseDeckEditor}>
                Close
              </button>
            </div>
          </div>

          <div className="deck-editor-rules">
            <span>Ultimate cards: max {MAX_ULTIMATE_COPIES} total copy in deck.</span>
            <span>Other cards: max 2 copies each.</span>
            <span>Use &quot;Apply &amp; Restart&quot; to lock in the deck and restart the battle.</span>
          </div>

          <div className="deck-editor-panels">
            <section className="deck-editor-panel deck-editor-collection-panel" aria-label="Card collection">
              <header>
                <strong>Collection</strong>
                <span>{filteredDeckEditorRows.length} cards</span>
              </header>
              <div className="deck-editor-controls">
                <label className="deck-editor-search-field">
                  <span className="sr-only">Search cards</span>
                  <input
                    type="search"
                    value={deckSearch}
                    onChange={(event) => setDeckSearch(event.target.value)}
                    placeholder="Search cards, effects, keywords..."
                  />
                </label>
                <div className="deck-editor-filter-groups">
                  <div className="deck-editor-filter-row" role="group" aria-label="Filter by card type">
                    {TYPE_FILTER_OPTIONS.map((option) => {
                      const selected = deckTypeFilter === option.value
                      return (
                        <button
                          key={`type-filter:${option.value}`}
                          type="button"
                          className={`deck-editor-filter-toggle ${selected ? 'active' : ''}`.trim()}
                          onClick={() => setDeckTypeFilter(option.value)}
                          aria-pressed={selected}
                          title={option.label}
                        >
                          <Icon icon={option.icon} aria-hidden="true" />
                        </button>
                      )
                    })}
                  </div>
                  <div className="deck-editor-filter-row" role="group" aria-label="Filter by rarity">
                    {RARITY_FILTER_OPTIONS.map((option) => {
                      const selected = deckRarityFilter === option.value
                      return (
                        <button
                          key={`rarity-filter:${option.value}`}
                          type="button"
                          className={`deck-editor-filter-toggle rarity-${option.value} ${selected ? 'active' : ''}`.trim()}
                          onClick={() => setDeckRarityFilter(option.value)}
                          aria-pressed={selected}
                          title={option.label}
                        >
                          <Icon icon={option.icon} aria-hidden="true" />
                        </button>
                      )
                    })}
                  </div>
                  <div className="deck-editor-cost-filter-row" role="group" aria-label="Filter by mana cost">
                    {DECK_COST_FILTERS.map((costValue) => {
                      const selected = deckCostFilter === costValue
                      const label = costValue === 'all' ? 'Any' : costValue
                      return (
                        <button
                          key={`cost-filter:${costValue}`}
                          type="button"
                          className={`deck-editor-cost-toggle ${selected ? 'active' : ''}`.trim()}
                          onClick={() => setDeckCostFilter(costValue)}
                          aria-pressed={selected}
                          title={costValue === 'all' ? 'All Costs' : `Cost ${costValue}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="deck-editor-gallery" role="list" aria-label="Available cards">
                {filteredDeckEditorRows.length > 0 ? (
                  filteredDeckEditorRows.map((entry) => {
                    const iconMeta = getCardIconMeta(entry.card.id)
                    const isSelected = selectedDeckCardEntry?.card.id === entry.card.id
                    const canAdd = entry.inPool > 0 && deckEditorHero.openingDeckCardIds.length < MAX_DECK_SIZE
                    const canRemove = entry.inDeck > 0
                    const gallerySummary = entry.card.summaryText ?? entry.card.effectTexts[0] ?? 'No summary available.'

                    return (
                      <article key={`gallery:${entry.card.id}`} className={`deck-editor-gallery-card rarity-${entry.card.rarity} ${isSelected ? 'selected' : ''}`.trim()} role="listitem">
                        <button type="button" className="deck-editor-gallery-main" onClick={() => setSelectedDeckCardId(entry.card.id)} onDoubleClick={() => addDeckCopy(entry.card.id)} title="Double-click to add to deck">
                          <span className="deck-editor-gallery-cost">{entry.card.moveCost}</span>
                          <Icon icon={iconMeta.id} style={getVisualIconStyle(iconMeta)} className="deck-editor-gallery-icon" aria-hidden="true" />
                          <span className="deck-editor-gallery-name">{entry.card.name}</span>
                          <span className="deck-editor-gallery-meta">{getCardTypeLabel(entry.card.type)} · {entry.card.rarity}</span>
                          <span className="deck-editor-gallery-summary">{gallerySummary}</span>
                        </button>
                        <div className="deck-editor-gallery-actions">
                          <button type="button" onClick={() => addDeckCopy(entry.card.id)} disabled={!canAdd} aria-label={`Add ${entry.card.name} to deck`}>
                            +
                          </button>
                          <button type="button" onClick={() => removeDeckCopy(entry.card.id)} disabled={!canRemove} aria-label={`Remove ${entry.card.name} from deck`}>
                            -
                          </button>
                          <span className="deck-editor-gallery-count">{entry.inDeck}/{entry.maxCopies}</span>
                        </div>
                      </article>
                    )
                  })
                ) : (
                  <p className="deck-editor-empty">No cards match these filters.</p>
                )}
              </div>
            </section>

            <section className="deck-editor-panel deck-editor-side-panel" aria-label="Deck planner">
              <header>
                <strong>Planner</strong>
                <span>{deckEditorHero.openingDeckCardIds.length}/{MAX_DECK_SIZE}</span>
              </header>
              <div className="deck-editor-side-content">
                {selectedDeckCardEntry ? (
                  <article className={`deck-editor-detail rarity-${selectedDeckCardEntry.card.rarity}`.trim()}>
                    <div className="deck-editor-detail-head">
                      <span className="deck-editor-detail-cost">{selectedDeckCardEntry.card.moveCost}</span>
                      <Icon
                        icon={getCardIconMeta(selectedDeckCardEntry.card.id).id}
                        style={getVisualIconStyle(getCardIconMeta(selectedDeckCardEntry.card.id))}
                        className="deck-editor-detail-icon"
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{selectedDeckCardEntry.card.name}</strong>
                        <span>{getCardTypeLabel(selectedDeckCardEntry.card.type)} · {selectedDeckCardEntry.card.rarity}</span>
                      </div>
                    </div>
                    <p>{selectedDeckCardEntry.card.summaryText ?? 'No summary text available.'}</p>
                    {selectedDeckCardEntry.card.effectTexts.length > 0 ? (
                      <div className="deck-editor-detail-effects">
                        {selectedDeckCardEntry.card.effectTexts.map((line, index) => (
                          <span key={`${selectedDeckCardEntry.card.id}-effect-${index}`}>{line}</span>
                        ))}
                      </div>
                    ) : null}
                    {selectedDeckCardEntry.card.castConditionText ? (
                      <p className="deck-editor-detail-condition">Condition: {selectedDeckCardEntry.card.castConditionText}</p>
                    ) : null}
                    {selectedDeckCardEntry.card.keywords.length > 0 ? (
                      <div className="deck-editor-keywords" aria-label="Card keywords">
                        {selectedDeckCardEntry.card.keywords.map((keyword) => (
                          <span key={`${selectedDeckCardEntry.card.id}-${keyword.id}`} className="deck-editor-keyword-chip" title={keyword.summaryText}>
                            {keyword.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="deck-editor-detail-actions">
                      <button
                        type="button"
                        onClick={() => addDeckCopy(selectedDeckCardEntry.card.id)}
                        disabled={selectedDeckCardEntry.inPool <= 0 || deckEditorHero.openingDeckCardIds.length >= MAX_DECK_SIZE}
                      >
                        Add To Deck
                      </button>
                      <button type="button" onClick={() => removeDeckCopy(selectedDeckCardEntry.card.id)} disabled={selectedDeckCardEntry.inDeck <= 0}>
                        Remove Copy
                      </button>
                    </div>
                  </article>
                ) : (
                  <p className="deck-editor-empty">Select a card from the collection to inspect details.</p>
                )}

                <div className="deck-editor-deck-list-wrap">
                  <strong>Deck List</strong>
                  <div className="deck-editor-mana-curve" role="img" aria-label="Mana curve distribution">
                    {manaCurve.entries.map((entry) => {
                      const fillHeight = `${Math.max((entry.count / manaCurve.maxCount) * 100, entry.count > 0 ? 10 : 4)}%`
                      return (
                        <div key={`curve:${entry.costBucket}`} className="deck-editor-mana-curve-slot" title={`${entry.costBucket}: ${entry.count}`}>
                          <div className="deck-editor-mana-curve-bar-wrap">
                            <span className="deck-editor-mana-curve-bar" style={{ height: fillHeight }} />
                          </div>
                          <span className="deck-editor-mana-curve-cost">{entry.costBucket}</span>
                          <span className="deck-editor-mana-curve-count">{entry.count}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="deck-editor-list">
                    {deckRowsByCostBucket.length > 0 ? (
                      deckRowsByCostBucket.map((group) => (
                        <section key={`deck-group:${group.costBucket}`} className="deck-editor-cost-group" aria-label={`Cost ${group.costBucket} cards`}>
                          <header>
                            <span>{group.costBucket}</span>
                          </header>
                          <div className="deck-editor-cost-group-rows">
                            {group.entries.map((entry) => {
                              const iconMeta = getCardIconMeta(entry.card.id)
                              const isSelected = selectedDeckCardEntry?.card.id === entry.card.id
                              return (
                                <button
                                  key={`deck:${entry.card.id}`}
                                  type="button"
                                  className={`deck-editor-deck-row rarity-${entry.card.rarity} ${isSelected ? 'selected' : ''}`.trim()}
                                  onClick={() => setSelectedDeckCardId(entry.card.id)}
                                  onDoubleClick={() => removeDeckCopy(entry.card.id)}
                                  title="Double-click to remove a copy"
                                >
                                  <span className="deck-editor-card-cost">{entry.card.moveCost}</span>
                                  <Icon icon={iconMeta.id} style={getVisualIconStyle(iconMeta)} className="deck-editor-deck-row-icon" aria-hidden="true" />
                                  <span className="deck-editor-card-main">
                                    <span className="deck-editor-card-name">{entry.card.name}</span>
                                    <span className="deck-editor-card-meta">{getCardTypeLabel(entry.card.type)}</span>
                                  </span>
                                  <span className="deck-editor-card-count">{entry.inDeck}x</span>
                                </button>
                              )
                            })}
                          </div>
                        </section>
                      ))
                    ) : (
                      <p className="deck-editor-empty">No cards in deck yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {isSavedDecksOpen ? (
            <div className="saved-decks-overlay">
              <div className="saved-decks-panel">
                <div className="saved-decks-header">
                  <strong>Saved Decks — {deckEditorHeroIndex === 0 ? 'Player A' : 'Player B'}</strong>
                  <button
                    type="button"
                    className="deck-editor-close"
                    onClick={() => setIsSavedDecksOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="saved-decks-save-row">
                  <input
                    type="text"
                    className="saved-decks-name-input"
                    value={savedDecksNewName}
                    onChange={(event) => setSavedDecksNewName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleSaveAsNew()
                      }
                    }}
                    placeholder="Name for new save..."
                  />
                  <button
                    type="button"
                    className="deck-editor-save"
                    onClick={handleSaveAsNew}
                    disabled={!savedDecksNewName.trim()}
                  >
                    Save as New
                  </button>
                </div>

                <div className="saved-decks-list">
                  {currentHeroSavedDecks.length === 0 ? (
                    <p className="saved-decks-empty">No saved decks yet. Save the current deck to get started.</p>
                  ) : (
                    currentHeroSavedDecks.map((deck) => (
                      <div key={deck.id} className="saved-deck-row">
                        {editingDeckId === deck.id ? (
                          <div className="saved-deck-rename-row">
                            <input
                              type="text"
                              className="saved-decks-name-input"
                              value={editingDeckName}
                              onChange={(event) => setEditingDeckName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  handleConfirmRename()
                                } else if (event.key === 'Escape') {
                                  event.stopPropagation()
                                  handleCancelRename()
                                }
                              }}
                              autoFocus
                            />
                            <button type="button" className="deck-editor-save" onClick={handleConfirmRename} disabled={!editingDeckName.trim()}>
                              Save
                            </button>
                            <button type="button" className="deck-editor-close" onClick={handleCancelRename}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="saved-deck-info">
                            <span className="saved-deck-name">{deck.name}</span>
                            <span className="saved-deck-count">{deck.cardIds.length} cards</span>
                          </div>
                        )}
                        {editingDeckId !== deck.id ? (
                          <div className="saved-deck-actions">
                            <button type="button" className="saved-deck-action-btn" onClick={() => handleLoadDeck(deck)}>
                              Load
                            </button>
                            <button type="button" className="saved-deck-action-btn" onClick={() => handleSaveOverwrite(deck.id)}>
                              Overwrite
                            </button>
                            <button type="button" className="saved-deck-action-btn" onClick={() => handleStartRename(deck)}>
                              Rename
                            </button>
                            <button type="button" className="saved-deck-action-btn saved-deck-delete-btn" onClick={() => handleDeleteSavedDeck(deck.id)}>
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
          </div>,
          document.body,
        )
        : null}
    </Rnd>
  )
}

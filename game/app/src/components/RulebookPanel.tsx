import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@iconify/react/offline'
import {
  RULEBOOK_QUICK_FACTS,
  RULEBOOK_SECTIONS,
  RULEBOOK_SUBTITLE,
  RULEBOOK_TITLE,
  type RulebookDiagramKind,
} from '../data/rulebook-content.ts'

type RulebookPanelProps = {
  isOpen: boolean
  onClose: () => void
}

function RulebookDiagram({ kind }: { kind: RulebookDiagramKind }) {
  switch (kind) {
    case 'start':
      return (
        <div className="rulebook-diagram rulebook-diagram-start">
          <div className="rulebook-diagram-card rulebook-diagram-card-hero">
            <Icon icon="game-icons:visored-helm" aria-hidden="true" />
            <span>Choose a hero</span>
          </div>
          <div className="rulebook-diagram-arrow" aria-hidden="true">→</div>
          <div className="rulebook-diagram-card rulebook-diagram-card-deck">
            <Icon icon="game-icons:card-pick" aria-hidden="true" />
            <span>Draw opening hand</span>
          </div>
          <div className="rulebook-diagram-arrow" aria-hidden="true">→</div>
          <div className="rulebook-diagram-card rulebook-diagram-card-board">
            <Icon icon="game-icons:crossed-swords" aria-hidden="true" />
            <span>Take the first turn</span>
          </div>
        </div>
      )
    case 'turn':
      return (
        <div className="rulebook-diagram rulebook-diagram-steps">
          {[
            ['1', 'Draw 1 card (if below 4)'],
            ['2', 'Spend move points'],
            ['3', 'Choose targets or positions'],
            ['4', 'End turn'],
          ].map(([step, label]) => (
            <div key={step} className="rulebook-step-pill">
              <strong>{step}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )
    case 'cards':
      return (
        <div className="rulebook-diagram rulebook-diagram-card-types">
          {([
            ['Ability', 'game-icons:crossed-swords'],
            ['Weapon', 'game-icons:broadsword'],
            ['Totem', 'game-icons:obelisk'],
            ['Companion', 'game-icons:wolf-head'],
          ] as const).map(([label, icon]) => (
            <div key={label} className="rulebook-card-type">
              <Icon icon={icon} aria-hidden="true" />
              <strong>{label}</strong>
              <span>Each fills a different tactical role.</span>
            </div>
          ))}
        </div>
      )
    case 'battlefield':
      return (
        <div className="rulebook-diagram rulebook-diagram-grid">
          <div className="rulebook-grid-row">
            <span className="rulebook-grid-cell rulebook-grid-ally rulebook-grid-hero">Hero</span>
            <span className="rulebook-grid-cell rulebook-grid-ally">Adjacency</span>
            <span className="rulebook-grid-cell rulebook-grid-neutral">Open slot</span>
          </div>
          <div className="rulebook-grid-row">
            <span className="rulebook-grid-cell rulebook-grid-ally">Support</span>
            <span className="rulebook-grid-cell rulebook-grid-highlight">Target area</span>
            <span className="rulebook-grid-cell rulebook-grid-enemy">Enemy</span>
          </div>
          <p className="rulebook-diagram-caption">Position decides protection, reach, and who can be chosen as a target.</p>
        </div>
      )
    case 'luck':
      return (
        <div className="rulebook-diagram rulebook-diagram-luck">
          <div className="rulebook-luck-track" aria-hidden="true">
            <span />
            <span />
            <span className="rulebook-luck-active" />
            <span />
            <span />
          </div>
          <div className="rulebook-luck-labels">
            <span>Minimum</span>
            <span>Neutral</span>
            <span>Maximum</span>
          </div>
          <p>Luck adjusts the result after the roll. It gently nudges outcomes up or down.</p>
        </div>
      )
    case 'deck':
      return (
        <div className="rulebook-diagram rulebook-diagram-deck">
          <div className="rulebook-deck-stack" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="rulebook-deck-rules">
            <div><strong>Ultimate</strong><span>keep rare and deliberate</span></div>
            <div><strong>Core cards</strong><span>build your main plan</span></div>
            <div><strong>Support cards</strong><span>fill gaps and buy tempo</span></div>
          </div>
        </div>
      )
    case 'glossary':
      return (
        <div className="rulebook-diagram rulebook-diagram-glossary">
          <div className="rulebook-glossary-chip"><Icon icon="game-icons:keyboard" aria-hidden="true" />Shortcuts</div>
          <div className="rulebook-glossary-chip"><Icon icon="game-icons:eye-target" aria-hidden="true" />Inspect</div>
          <div className="rulebook-glossary-chip"><Icon icon="game-icons:card-pick" aria-hidden="true" />Cards</div>
          <div className="rulebook-glossary-chip"><Icon icon="game-icons:checked-shield" aria-hidden="true" />Defense</div>
        </div>
      )
    default:
      return null
  }
}

export function RulebookPanel({ isOpen, onClose }: RulebookPanelProps) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [isTocCollapsed, setIsTocCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }

    return window.matchMedia('(pointer: coarse)').matches
  })
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(RULEBOOK_SECTIONS.map((section, index) => [section.id, index === 0]))
  })

  const isAllOpen = useMemo(
    () => RULEBOOK_SECTIONS.every((section) => openSections[section.id]),
    [openSections],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const handleToggleSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }))
  }

  const handleJumpToSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: true,
    }))

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      setIsTocCollapsed(true)
    }

    window.requestAnimationFrame(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleToggleAll = () => {
    const nextValue = !isAllOpen
    setOpenSections(Object.fromEntries(RULEBOOK_SECTIONS.map((section) => [section.id, nextValue])))
  }

  return createPortal(
    <div className="rulebook-overlay" role="presentation" onClick={onClose}>
      <section
        className="rulebook-modal"
        role="dialog"
        aria-modal="true"
        aria-label={RULEBOOK_TITLE}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rulebook-header">
          <div className="rulebook-title-wrap">
            <div className="rulebook-title-icon">
              <Icon icon="game-icons:open-book" aria-hidden="true" />
            </div>
            <div>
              <strong>{RULEBOOK_TITLE}</strong>
              <p>{RULEBOOK_SUBTITLE}</p>
            </div>
          </div>
          <div className="rulebook-header-actions">
            <button type="button" onClick={handleToggleAll}>{isAllOpen ? 'Collapse all' : 'Expand all'}</button>
            <button type="button" onClick={onClose}>Close</button>
          </div>
        </header>

        <div className="rulebook-shell">
          <aside className={`rulebook-toc${isTocCollapsed ? ' rulebook-toc-collapsed' : ''}`} aria-label="Rulebook contents">
            <div className="rulebook-toc-intro">
              <div className="rulebook-toc-head">
                <strong>Contents</strong>
                <button
                  type="button"
                  className="rulebook-toc-toggle"
                  onClick={() => setIsTocCollapsed((current) => !current)}
                  aria-expanded={isTocCollapsed ? 'false' : 'true'}
                  aria-controls="rulebook-toc-list"
                >
                  {isTocCollapsed ? 'Show' : 'Hide'}
                </button>
              </div>
              {!isTocCollapsed ? <span>Jump to any section.</span> : null}
            </div>
            {!isTocCollapsed ? <nav id="rulebook-toc-list" className="rulebook-toc-list">
              {RULEBOOK_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`rulebook-toc-item${openSections[section.id] ? ' rulebook-toc-item-active' : ''}`.trim()}
                  onClick={() => handleJumpToSection(section.id)}
                >
                  <Icon icon={section.icon} aria-hidden="true" />
                  <span>{section.title}</span>
                </button>
              ))}
            </nav> : null}
          </aside>

          <div className="rulebook-content">
            <section className="rulebook-hero">
              <div className="rulebook-hero-copy">
                <strong>Learn the game from setup to battlefield control.</strong>
                <p>
                  You win by reducing the enemy hero to 0 health. This guide explains the two core spaces you manage
                  every turn: your hand (cards you can play) and the battlefield (where placement and targeting decide
                  the fight), plus how to choose the best action order and manage risk.
                </p>
              </div>
              <div className="rulebook-facts" aria-label="Quick facts">
                {RULEBOOK_QUICK_FACTS.map((fact) => (
                  <div key={fact.label} className="rulebook-fact-card">
                    <Icon icon={fact.icon} aria-hidden="true" />
                    <strong>{fact.label}</strong>
                    <span>{fact.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="rulebook-sections">
              {RULEBOOK_SECTIONS.map((section) => {
                const isSectionOpen = openSections[section.id]

                return (
                  <article
                    key={section.id}
                    ref={(element) => {
                      sectionRefs.current[section.id] = element
                    }}
                    className={`rulebook-section${isSectionOpen ? ' rulebook-section-open' : ''}`.trim()}
                  >
                    <button
                      type="button"
                      className="rulebook-section-header"
                      aria-expanded={isSectionOpen}
                      onClick={() => handleToggleSection(section.id)}
                    >
                      <span className="rulebook-section-title-wrap">
                        <span className="rulebook-section-icon"><Icon icon={section.icon} aria-hidden="true" /></span>
                        <span>
                          <strong>{section.title}</strong>
                          <em>{section.summary}</em>
                        </span>
                      </span>
                      <span className="rulebook-section-toggle" aria-hidden="true">{isSectionOpen ? '−' : '+'}</span>
                    </button>

                    {isSectionOpen ? (
                      <div className="rulebook-section-body">
                        <RulebookDiagram kind={section.diagram} />
                        <ul>
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
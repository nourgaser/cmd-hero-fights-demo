import { Icon } from '@iconify/react/offline'

type ActionControlsProps = {
  selfId: string
  onBasicAttack: () => void
  onUseEntityActive: () => void
  onPressLuck: () => void
  onEndTurn: () => void
}

export function ActionControls(props: ActionControlsProps) {
  const { onBasicAttack, onUseEntityActive, onPressLuck, onEndTurn } = props

  const actions = [
    {
      id: 'attack',
      icon: 'game-icons:crossed-swords',
      label: 'Attack',
      description: 'Deal damage to an enemy unit.',
      onClick: onBasicAttack,
    },
    {
      id: 'active',
      icon: 'game-icons:spell-book',
      label: 'Entity Active',
      description: "Use an entity's active ability.",
      onClick: onUseEntityActive,
    },
    {
      id: 'luck',
      icon: 'game-icons:shamrock',
      label: 'Press Luck',
      description: 'Press your luck to shift the balance.',
      onClick: onPressLuck,
    },
    {
      id: 'end',
      icon: 'game-icons:hourglass',
      label: 'End Turn',
      description: 'End your turn and pass to opponent.',
      onClick: onEndTurn,
    },
  ]

  return (
    <aside className="action-controls" aria-label="Action controls">
      <nav className="action-buttons" role="toolbar" aria-label="Play actions">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="action-button hint-wrap"
            onClick={action.onClick}
            aria-label={action.label}
            title={action.label}
            tabIndex={0}
          >
            <Icon icon={action.icon} className="action-icon" aria-hidden="true" />
            <span className="sr-only">{action.label}</span>
            <span className="hover-card action-hover-card" role="tooltip">
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

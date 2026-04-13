import { Icon } from '@iconify/react/offline'
import './style.css'

type LuckBarProps = {
  selfLuck: number
  enemyLuck: number
  capacity: number
  iconId: string
}

export function LuckBar(props: LuckBarProps) {
  const { selfLuck, enemyLuck, capacity, iconId } = props
  const ariaText = `Luck meter. Your side has ${selfLuck} of ${capacity}. Opponent side has ${enemyLuck} of ${capacity}.`

  return (
    <div className="luck-wrap">
      <div className="luck-bar" aria-label={ariaText} role="img">
        <div className="luck-side side-a">
          {Array.from({ length: capacity }).map((_, idx) => {
            const isOn = idx >= capacity - selfLuck
            return (
              <span key={`self-${idx}`} className={`luck-pip self ${isOn ? 'on' : ''}`} aria-hidden="true">
                <Icon icon={iconId} className="luck-pip-icon" aria-hidden="true" />
              </span>
            )
          })}
        </div>
        <span className="luck-divider" aria-hidden="true" />
        <div className="luck-side side-b">
          {Array.from({ length: capacity }).map((_, idx) => {
            const isOn = idx < enemyLuck
            return (
              <span key={`enemy-${idx}`} className={`luck-pip enemy ${isOn ? 'on' : ''}`} aria-hidden="true">
                <Icon icon={iconId} className="luck-pip-icon" aria-hidden="true" />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { onSoundChange, restoreSound, setSound } from '@/fx/sound'

/* A polish bottle: the lacquer inside fills up when sound is on. */
export function SoundToggle() {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(restoreSound())
    return onSoundChange(setOn)
  }, [])

  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={on}
      aria-label={on ? 'Выключить звук' : 'Включить звук'}
      title={on ? 'Звук включён' : 'Звук выключен'}
      onClick={() => setSound(!on)}
    >
      <svg viewBox="0 0 24 32" width="18" height="24" aria-hidden="true">
        <rect x="8.5" y="1" width="7" height="9" rx="1.6" className="sound-toggle__cap" />
        <path d="M6 11.5h12c1.7 0 3 1.3 3 3V28c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3V14.5c0-1.7 1.3-3 3-3Z" className="sound-toggle__glass" />
        <path d="M4.5 20.5h15V28c0 .8-.7 1.5-1.5 1.5H6c-.8 0-1.5-.7-1.5-1.5v-7.5Z" className="sound-toggle__lacquer" />
      </svg>
      <span className="sound-toggle__label">{on ? 'Звук' : 'Без звука'}</span>
    </button>
  )
}

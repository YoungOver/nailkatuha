import { NAIL_SHAPES } from '@/content/nailShape'

export function NailMasks() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        {Object.entries(NAIL_SHAPES).map(([length, { path }]) => (
          <clipPath key={length} id={`nail-${length}`} clipPathUnits="objectBoundingBox">
            <path d={path} />
          </clipPath>
        ))}
      </defs>
    </svg>
  )
}

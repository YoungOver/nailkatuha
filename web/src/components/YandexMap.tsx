'use client'

import { useState } from 'react'

/*
 * The official Yandex map widget: an iframe that needs no API key, unlike the
 * JS API, which shows a key error and a grey box on phones without one. It is
 * loaded lazily, and the tiles are darkened with a filter to match the page.
 * On a touch screen the map waits for a tap first, so a swipe scrolls the page
 * instead of dragging the map.
 */
export function YandexMap({ coords, label }: { coords: readonly [number, number]; label: string }) {
  const [active, setActive] = useState(false)
  const [lat, lon] = coords
  const src = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdl&l=map`
  return (
    <div className="map" data-active={active || undefined}>
      <iframe className="map__canvas" src={src} title={`Карта: ${label}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      {!active && (
        <button type="button" className="map__cover" onClick={() => setActive(true)}>
          <span>Нажмите, чтобы двигать карту</span>
        </button>
      )}
    </div>
  )
}

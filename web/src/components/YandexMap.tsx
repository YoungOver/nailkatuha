'use client'

import { useEffect, useRef, useState } from 'react'
import { lacquerStore } from '@/fx/lacquer'

type Placemark = { options: { set(key: string, value: unknown): void } }

type Ymaps = {
  ready(cb: () => void): void
  Map: new (el: HTMLElement, opts: object, extra?: object) => { geoObjects: { add(o: unknown): void }; behaviors: { disable(n: string): void }; destroy(): void }
  Placemark: new (coords: readonly number[], props: object, opts: object) => Placemark
}

let loader: Promise<Ymaps> | null = null

function loadYmaps(): Promise<Ymaps> {
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
    s.async = true
    s.onload = () => {
      const y = (window as unknown as { ymaps: Ymaps }).ymaps
      y.ready(() => resolve(y))
    }
    s.onerror = () => reject(new Error('ymaps'))
    document.head.appendChild(s)
  })
  return loader
}

/* The map script is heavy, so it loads only when the contacts come near the viewport. */
export function YandexMap({ coords, label }: { coords: readonly [number, number]; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>('idle')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let map: { destroy(): void } | null = null
    let cancelled = false
    let offStore = () => {}
    /* the map draws its logo as an empty link; give every such link a name for screen readers */
    const nameLinks = () =>
      el.querySelectorAll('a').forEach((a) => {
        if (!a.textContent?.trim() && !a.hasAttribute('aria-label')) a.setAttribute('aria-label', 'Яндекс Карты')
      })
    const links = new MutationObserver(nameLinks)
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        loadYmaps()
          .then((ymaps) => {
            if (cancelled) return
            const m = new ymaps.Map(el, { center: coords, zoom: 16, controls: ['zoomControl'] }, { suppressMapOpenBlock: true })
            m.behaviors.disable('scrollZoom')
            /* the pin wears the lacquer chosen in the hero, like the rest of the site */
            const pin = new ymaps.Placemark(coords, { hintContent: label }, { preset: 'islands#dotIcon', iconColor: lacquerStore.get().lacquer.hex })
            m.geoObjects.add(pin)
            offStore = lacquerStore.subscribe((s) => pin.options.set('iconColor', s.lacquer.hex))
            links.observe(el, { childList: true, subtree: true })
            nameLinks()
            map = m
            setState('ready')
          })
          .catch(() => setState('failed'))
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      links.disconnect()
      offStore()
      map?.destroy()
    }
  }, [coords, label])

  return (
    <div className="map" data-state={state}>
      <div ref={ref} className="map__canvas" role="region" aria-label={`Карта: ${label}`} />
      {state === 'failed' && <p className="map__fallback">Карта не загрузилась. Маршрут можно открыть в Яндекс Картах по ссылке рядом.</p>}
    </div>
  )
}

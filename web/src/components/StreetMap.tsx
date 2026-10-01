/*
 * A still Yandex map image: no ads (the keyless Yandex widget shows them,
 * recruitment ads included), no key, no script, and it never steals a swipe on
 * a phone. The image is centred on the address, so the lacquer pin sits in the
 * middle of the frame; the route itself opens in Yandex Maps.
 */
export function StreetMap({ coords, label, route }: { coords: readonly [number, number]; label: string; route: string }) {
  const [lat, lon] = coords
  const src = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=16&l=map&size=650,450&scale=2&lang=ru_RU`
  return (
    <div className="map">
      <img className="map__image" src={src} alt={`Карта: ${label}`} width={650} height={450} loading="lazy" decoding="async" />
      <span className="map__pin" aria-hidden="true" />
      <a className="map__open chip" href={route} target="_blank" rel="noopener">
        Открыть в Яндекс Картах
      </a>
    </div>
  )
}

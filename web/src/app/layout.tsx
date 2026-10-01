import type { Metadata, Viewport } from 'next'
import { Golos_Text, Jost } from 'next/font/google'
import { prices } from '@/content/prices'
import { LACQUERS, textOn } from '@/fx/lacquer'
import { studio } from '@/content/studio'
import './globals.css'

const display = Jost({ subsets: ['latin', 'cyrillic'], variable: '--font-display', display: 'swap' })
const body = Golos_Text({ subsets: ['latin', 'cyrillic'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'nailkatuha: маникюр и nail art в Санкт-Петербурге',
  description:
    'Маникюр, покрытие, наращивание и nail art у метро Проспект Большевиков. Цены, работы мастера и запись на свободное окошко через Telegram.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title: 'nailkatuha',
    description: studio.masterLine,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0B10',
  colorScheme: 'dark',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  name: studio.name,
  description: studio.masterLine,
  address: {
    '@type': 'PostalAddress',
    streetAddress: studio.address,
    addressLocality: studio.city,
    addressCountry: 'RU',
  },
  geo: { '@type': 'GeoCoordinates', latitude: studio.coords[0], longitude: studio.coords[1] },
  priceRange: `${Math.min(...prices.map((p) => p.priceRub))}–${Math.max(...prices.map((p) => p.priceRub))} ₽`,
  sameAs: studio.socials.map((s) => s.href),
  makesOffer: prices.map((p) => ({
    '@type': 'Offer',
    name: `${p.category}: ${p.name}`,
    price: p.priceRub,
    priceCurrency: 'RUB',
  })),
}

/* Applies the saved lacquer before first paint so a returning visitor never sees the default flash. */
const lacquerBoot = `try{var m=${JSON.stringify(Object.fromEntries(LACQUERS.map((l) => [l.id, [l.hex, textOn(l.hex)]])))};var v=m[localStorage.getItem('nailkatuha:lacquer')];if(v){var r=document.documentElement;r.style.setProperty('--lacquer',v[0]);r.style.setProperty('--on-lacquer',v[1]);}}catch(e){}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: lacquerBoot }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          К содержимому
        </a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </body>
    </html>
  )
}

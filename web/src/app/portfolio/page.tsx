import type { Metadata } from 'next'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

export const metadata: Metadata = {
  title: 'nailkatuha: работы',
  robots: { index: false },
}

/* The portfolio now lives on the main page; old links land on the gallery there. */
export default function PortfolioMoved() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${base}/#works`} />
      <p style={{ padding: '6rem 1.5rem' }}>
        Работы теперь на главной: <a href={`${base}/#works`}>перейти к работам</a>.
      </p>
    </>
  )
}

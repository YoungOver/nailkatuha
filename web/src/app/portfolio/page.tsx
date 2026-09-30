import type { Metadata } from 'next'
import { NailMasks } from '@/components/NailMasks'
import { works } from '@/content/works'
import { NailFile } from '@/fx/NailFile'
import { Footer } from '@/sections/Footer'
import { Header } from '@/sections/Header'
import { Portfolio } from '@/sections/Portfolio'

export const metadata: Metadata = {
  title: `Портфолио nailkatuha: ${works.length} работ`,
  description: 'Работы мастера: короткие и экстремальные длины, хром, френч, нюд, дизайн и мудборды с референсами.',
}

export default function PortfolioPage() {
  return (
    <>
      <NailMasks />
      <Header />
      <main className="portfolio-page">
        <Portfolio />
      </main>
      <Footer />
      <NailFile />
    </>
  )
}

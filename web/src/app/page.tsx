import { NailMasks } from '@/components/NailMasks'
import { NailFile } from '@/fx/NailFile'
import { Booking } from '@/sections/Booking'
import { Contacts } from '@/sections/Contacts'
import { Footer } from '@/sections/Footer'
import { Header } from '@/sections/Header'
import { Hero } from '@/sections/Hero'
import { Prices } from '@/sections/Prices'
import { Reasons } from '@/sections/Reasons'
import { Services } from '@/sections/Services'
import { Works } from '@/sections/Works'

export default function Home() {
  return (
    <>
      <NailMasks />
      <Header />
      <main>
        <Hero />
        <Works />
        <Reasons />
        <Services />
        <Prices />
        <Booking />
        <Contacts />
      </main>
      <Footer />
      <NailFile />
    </>
  )
}

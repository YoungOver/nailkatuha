import { NailMasks } from '@/components/NailMasks'
import { FileDust } from '@/fx/FileDust'
import { Flow } from '@/fx/flow/Flow'
import { Jumps } from '@/fx/Jumps'
import { Booking } from '@/sections/Booking'
import { Contacts } from '@/sections/Contacts'
import { Footer } from '@/sections/Footer'
import { Header } from '@/sections/Header'
import { Hero } from '@/sections/Hero'
import { Layers } from '@/sections/Layers'
import { Prices } from '@/sections/Prices'
import { Reasons } from '@/sections/Reasons'
import { Services } from '@/sections/Services'
import { TryOn } from '@/sections/TryOn'
import { Works } from '@/sections/Works'

export default function Home() {
  return (
    <>
      <Flow />
      <NailMasks />
      <Header />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Layers />
        <Works />
        <TryOn />
        <Reasons />
        <Services />
        <Prices />
        <Booking />
        <Contacts />
      </main>
      <Footer />
      <FileDust />
      <Jumps />
    </>
  )
}

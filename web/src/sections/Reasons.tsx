import type { CSSProperties } from 'react'
import { WorkImage } from '@/components/WorkImage'
import { studio } from '@/content/studio'
import { works } from '@/content/works'

/* Every reason is backed by one of the master's own works. */
const PROOF = [12, 2, 4, 10, 5].map((id) => works.find((w) => w.id === id)!)

/* A deck: each card sticks under the header and the next one slides over it while the previous one sinks back. */
export function Reasons() {
  return (
    <section id="reasons" className="reasons" aria-labelledby="reasons-title">
      <div className="wrap reasons__head">
        <h2 id="reasons-title" className="section-title" data-reveal>
          Пять причин прийти
        </h2>
      </div>
      <ol className="wrap reasons__deck">
        {studio.reasons.map((r, i) => (
          <li key={r} className="reasons__card" style={{ '--i': i } as CSSProperties}>
            <div className="reasons__inner">
              <div className="reasons__photo">
                <WorkImage work={PROOF[i]} sizes="(min-width: 900px) 40vw, 90vw" />
              </div>
              <div className="reasons__body">
                <span className="reasons__num">{i + 1}</span>
                <p className="reasons__line">{r}</p>
                <p className="reasons__caption">{PROOF[i].alt}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

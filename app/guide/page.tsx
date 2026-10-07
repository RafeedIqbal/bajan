import type { Metadata } from 'next'
import Image from 'next/image'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { labelAt, langFrom, text, type GuideSection, type Text } from '@/lib/i18n'
import still from '../avatar.webp'
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, ChevronIcon } from '../icons'

export async function generateMetadata(): Promise<Metadata> {
  return { title: text(langFrom((await cookies()).get('lang')?.value)).guideNav }
}

// {start} or {speechScale.0} → that on-screen label, styled so it reads as "the button that says this";
// **text** → bold. Labels come from the same strings the buttons use (npm test checks each one exists).
function rich(s: string, t: Text): ReactNode[] {
  return s.split(/(\{[\w.]+\}|\*\*.+?\*\*)/).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (!part.startsWith('{')) return part
    return (
      <strong key={i} className="ui-label">
        {labelAt(t, part.slice(1, -1)) ?? part}
      </strong>
    )
  })
}

function Section({ s, t }: { s: GuideSection; t: Text }) {
  return (
    <section id={s.id} className="card guide-section" aria-labelledby={`${s.id}-title`}>
      <h2 id={`${s.id}-title`}>{s.title}</h2>
      {s.body?.map((p, i) => <p key={i}>{rich(p, t)}</p>)}
      {s.steps && (
        <ol className="steps">
          {s.steps.map((step, i) => (
            <li key={i}>
              <span>{rich(step, t)}</span>
            </li>
          ))}
        </ol>
      )}
      {s.lists?.map((list, i) => (
        <div key={i} className="sublist">
          {list.title && <h3>{list.title}</h3>}
          <ul>
            {list.items.map((item, j) => (
              <li key={j}>{rich(item, t)}</li>
            ))}
          </ul>
        </div>
      ))}
      {s.faq && (
        <div className="faq">
          {s.faq.map((f, i) => (
            <details key={i}>
              <summary>
                <span>{rich(f.q, t)}</span>
                <ChevronIcon />
              </summary>
              <p>{rich(f.a, t)}</p>
            </details>
          ))}
        </div>
      )}
      {s.note && <p className="note-box">{rich(s.note, t)}</p>}
    </section>
  )
}

// The usage guide. Public (proxy.ts lets it through), so people can read it before signing in.
export default async function GuidePage() {
  const lang = langFrom((await cookies()).get('lang')?.value)
  const t = text(lang)
  const g = t.guide
  const contents = (
    <ol>
      {g.sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>{s.title}</a>
        </li>
      ))}
    </ol>
  )

  return (
    <main className="wide guide-page">
      <a className="text-link" href="/">
        <ArrowLeftIcon />
        {t.back}
      </a>
      <div className="guide-hero">
        <Image src={still} alt="" width={150} height={150} loading="eager" />
        <div className="page-head">
          <h1>{g.title}</h1>
          <p className="lead">{g.intro}</p>
        </div>
      </div>
      <p className="emergency">
        <AlertIcon />
        {g.emergency}
      </p>

      <section className="quick" aria-labelledby="quick-title">
        <h2 id="quick-title">{g.quickTitle}</h2>
        <ol className="quick-steps">
          {g.quick.map((q, i) => (
            <li key={i} className="card">
              <span className="step-num" aria-hidden="true">
                {(i + 1).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en')}
              </span>
              <h3>{rich(q.title, t)}</h3>
              <p>{rich(q.text, t)}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="guide-layout">
        {/* Phones: a fold-out list at the top. Computers: a list that stays beside the text. */}
        <details className="card toc toc-narrow">
          <summary>
            {g.onThisPage}
            <ChevronIcon />
          </summary>
          <nav aria-label={g.onThisPage}>{contents}</nav>
        </details>
        <nav className="toc toc-wide" aria-labelledby="toc-title">
          <h2 id="toc-title">{g.onThisPage}</h2>
          {contents}
        </nav>

        <div className="guide-sections">
          {g.sections.map((s) => (
            <Section key={s.id} s={s} t={t} />
          ))}
          <a className="button primary guide-cta" href="/">
            {g.cta}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </main>
  )
}

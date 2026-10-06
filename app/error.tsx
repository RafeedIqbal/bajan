'use client'

import { text } from '@/lib/i18n'
import { RepeatIcon } from './icons'

// Shown when a page fails to load (e.g. the database can't be reached). It can't read the language cookie,
// so it says everything in both languages.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [bn, en] = [text('bn'), text('en')]
  return (
    <main>
      <div className="card" role="alert">
        <h1>
          <span lang="bn">{bn.errorTitle}</span> · <span lang="en">{en.errorTitle}</span>
        </h1>
        <p lang="bn">{bn.errorText}</p>
        <p lang="en">{en.errorText}</p>
      </div>
      <button className="primary" onClick={() => retry()}>
        <RepeatIcon />
        <span>
          <span lang="bn">{bn.tryAgain}</span> / <span lang="en">{en.tryAgain}</span>
        </span>
      </button>
    </main>
  )
}

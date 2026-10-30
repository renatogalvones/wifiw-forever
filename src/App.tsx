import { Band } from './components/Band'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { RankingSection } from './components/RankingSection'
import { useLegacyRanking } from './hooks/useLegacyRanking'

type Page = 'home' | ArchivePageId

function pageFromHash(): Page {
  const hash = window.location.hash.slice(1)
  return ['resenha', 'rivalidade', 'gloria', 'wifiw-para-sempre'].includes(hash)
    ? (hash as ArchivePageId)
    : 'home'
}

export default function App() {
  const { seasons, players, loading, error } = useLegacyRanking()
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    const syncPage = () => setPage(pageFromHash())
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  return (
    <>
      <Header seasons={seasons} />
      <main>
        {page === 'home' && <div className="wrap"><Hero seasons={seasons} /></div>}
        <Band />
        <div className="wrap">
          {page === 'home' ? (
            <RankingSection seasons={seasons} players={players} loading={loading} error={error} />
          ) : (
            <ArchivePage page={page} players={players} />
          )}
        </div>
      </main>
      <Footer seasons={seasons} />
    </>
  )
}
import { useEffect, useState } from 'react'
import { ArchivePage, type ArchivePageId } from './components/ArchivePage'

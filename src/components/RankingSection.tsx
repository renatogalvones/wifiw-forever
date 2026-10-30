import { useMemo, useState } from 'react'
import { normalize } from '../lib/seasons'
import type { MetricKey, RankingPlayer, Season, SortKey } from '../types'
import { RankingTable } from './RankingTable'

type RankingSectionProps = {
  seasons: Season[]
  players: RankingPlayer[]
  loading: boolean
  error: string | null
}

type SortField = 'crowns' | 'titles' | 'total_points' | 'championships_played' | 'average'

const SORT_FIELDS: Record<Exclude<SortKey, 'position'>, SortField> = {
  crowns: 'crowns',
  titles: 'titles',
  points: 'total_points',
  championships: 'championships_played',
  average: 'average',
}

export function RankingSection({ seasons, players, loading, error }: RankingSectionProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('position')
  const [metric, setMetric] = useState<MetricKey>('seasonPoints')
  const [view, setView] = useState<'general' | 'yearByYear'>('general')

  const visiblePlayers = useMemo(() => {
    const term = normalize(search.trim())
    const filtered = players.filter(
      (player) =>
        normalize(player.player).includes(term) || normalize(player.player_key).includes(term),
    )

    if (sort === 'position') {
      return [...filtered].sort((a, b) => a.position - b.position)
    }

    const field = SORT_FIELDS[sort]
    return [...filtered].sort((a, b) => {
      const aValue = Number(a[field] ?? -1)
      const bValue = Number(b[field] ?? -1)
      return bValue - aValue || a.position - b.position
    })
  }, [players, search, sort])

  return (
    <section className="section" id="ranking">
      <div className="section-head">
        <div>
          <div className="eyebrow">O hall da fama</div>
          <h2>
            Legado WiFIW<span style={{ color: 'var(--lime)' }}>!!</span>
          </h2>
        </div>
        <p className="hint">A classificação histórica da liga, do primeiro ao último treinador.</p>
      </div>

      <div className="ranking-tabs" role="tablist" aria-label="Visualização da classificação">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'general'}
          className={view === 'general' ? 'active' : ''}
          onClick={() => setView('general')}
        >
          Geral
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'yearByYear'}
          className={view === 'yearByYear' ? 'active' : ''}
          onClick={() => setView('yearByYear')}
        >
          Ano a Ano
        </button>
      </div>

      <div className="controls">
        <input
          type="search"
          placeholder="Buscar treinador..."
          aria-label="Buscar treinador"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {view === 'yearByYear' && (
          <select
            aria-label="Tipo de dados por temporada"
            value={metric}
            onChange={(event) => setMetric(event.target.value as MetricKey)}
          >
            <option value="seasonPoints">Pontos por temporada</option>
            <option value="seasonTitles">Títulos por temporada</option>
          </select>
        )}
        <select
          aria-label="Ordenar classificação"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
        >
          <option value="position">Classificação histórica</option>
          <option value="crowns">Mais Corridas 🏆</option>
          <option value="titles">Mais títulos</option>
          <option value="points">Mais pontos</option>
          <option value="championships">Mais campeonatos jogados</option>
        </select>
      </div>

      {loading ? (
        <div className="empty" role="status">
          Carregando a classificação…
        </div>
      ) : error ? (
        <div className="empty" role="alert">
          Não foi possível carregar a classificação.
        </div>
      ) : (
        <>
          <RankingTable seasons={seasons} players={visiblePlayers} metric={metric} view={view} />
          {visiblePlayers.length === 0 && (
            <div className="empty" role="status">
              Nenhum treinador encontrado.
            </div>
          )}
        </>
      )}

      <p className="footnote">
        Fonte: campeonatos finalizados e partidas registradas na base da WiFIW. Pontos por temporada
        é a pontuação de ranking conquistada na temporada (1º: 10, 2º: 8, 3º: 6, 4º: 5, 5º: 4, 6º: 3, 7º: 2, 8º: 1).
        Traço indica dado não preenchido.
      </p>
    </section>
  )
}

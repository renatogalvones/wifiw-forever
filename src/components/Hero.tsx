import { formatSeason } from '../lib/seasons'
import type { Season } from '../types'

type HeroProps = {
  seasons: Season[]
}

export function Hero({ seasons }: HeroProps) {
  const sorted = [...seasons].sort((a, b) => a.sort_order - b.sort_order)
  const firstSeason = sorted[0]
  const lastSeason = sorted[sorted.length - 1]

  return (
    <section className="hero">
      <div>
        <div className="eyebrow">Mais de uma década de história</div>
        <h1>
          O jogo passa.
          <br />
          <span>O legado</span>
          <br />
          fica.
        </h1>
        <p className="intro">
          De temporada em temporada, cada ponto e cada título contam uma história. Conheça os
          treinadores que fizeram a WiFIW.
        </p>
      </div>
      <div className="hero-side">
        <small>Uma história em construção</small>
        <div className="big">
          {seasons.length || '—'}{' '}
          <span style={{ fontSize: 28, color: '#aab7a9' }}>temporadas</span>
        </div>
        <p>
          O legado reúne a classificação histórica calculada a partir dos campeonatos finalizados,
          de {firstSeason ? formatSeason(firstSeason.season) : '—'} a{' '}
          {lastSeason ? formatSeason(lastSeason.season) : '—'}.
        </p>
      </div>
    </section>
  )
}

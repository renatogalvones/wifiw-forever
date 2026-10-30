import { useMemo, useState } from 'react'
import type { RankingPlayer } from '../types'
import {
  canonicalRivalryPlayer,
  displayRivalryPlayer,
  useRivalryMatches,
} from '../hooks/useRivalryMatches'

export type ArchivePageId = 'resenha' | 'rivalidade' | 'gloria' | 'wifiw-para-sempre'

type ArchivePageProps = {
  page: ArchivePageId
  players: RankingPlayer[]
}

const pageTitles: Record<ArchivePageId, string> = {
  resenha: 'Recolhas',
  rivalidade: 'Rivalidade',
  gloria: 'Glória',
  'wifiw-para-sempre': 'WiFIW para sempre',
}

type HeadToHeadStats = {
  opponent: string
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
}

function Rivalidade({ players }: { players: RankingPlayer[] }) {
  const { matches, loading, error } = useRivalryMatches()
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  const playerNames = useMemo(() => {
    const rankedNames = [...new Set(players.map(({ player_key }) => canonicalRivalryPlayer(player_key)))]
    const names = new Set(rankedNames)
    for (const match of matches) {
      names.add(match.home_player)
      names.add(match.away_player)
    }
    const rankedSet = new Set(rankedNames)
    const remainingNames = [...names]
      .filter((name) => !rankedSet.has(name))
      .sort((a, b) => displayRivalryPlayer(a).localeCompare(displayRivalryPlayer(b), 'pt-BR'))
    return [...rankedNames, ...remainingNames]
  }, [matches, players])

  const comparisons = useMemo(() => {
    if (!selectedPlayer) return []
    const byOpponent = new Map<string, HeadToHeadStats>()

    for (const match of matches) {
      let opponent: string
      let goalsFor: number
      let goalsAgainst: number
      if (match.home_player === selectedPlayer) {
        opponent = match.away_player
        goalsFor = match.home_score
        goalsAgainst = match.away_score
      } else if (match.away_player === selectedPlayer) {
        opponent = match.home_player
        goalsFor = match.away_score
        goalsAgainst = match.home_score
      } else {
        continue
      }

      const record = byOpponent.get(opponent) ?? {
        opponent,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      }
      if (goalsFor > goalsAgainst) record.wins += 1
      else if (goalsFor < goalsAgainst) record.losses += 1
      else record.draws += 1
      record.goalsFor += goalsFor
      record.goalsAgainst += goalsAgainst
      byOpponent.set(opponent, record)
    }

    const rankOrder = new Map(playerNames.map((name, index) => [name, index]))
    return [...byOpponent.values()]
      .map((record) => ({
        ...record,
        status: record.wins > record.losses
          ? 'CRAQUE' as const
          : record.losses > record.wins
            ? 'PERDEDOR' as const
            : 'EMPATE' as const,
      }))
      .sort((a, b) => {
        const gamesDifference = (b.wins + b.losses + b.draws) - (a.wins + a.losses + a.draws)
        if (gamesDifference !== 0) return gamesDifference
        return (rankOrder.get(a.opponent) ?? Number.MAX_SAFE_INTEGER) -
          (rankOrder.get(b.opponent) ?? Number.MAX_SAFE_INTEGER)
      })
  }, [matches, playerNames, selectedPlayer])

  if (loading) return <p className="page-message">Carregando jogos...</p>
  if (error) return <p className="page-message page-error">Não foi possível carregar os jogos: {error}</p>

  return (
    <div className="rivalry-layout">
      <nav className="player-list" aria-label="Jogadores">
        {playerNames.map((player) => (
          <button
            type="button"
            key={player}
            className={player === selectedPlayer ? 'selected' : ''}
            aria-pressed={player === selectedPlayer}
            onClick={() => setSelectedPlayer(player)}
          >
            {displayRivalryPlayer(player)}
          </button>
        ))}
      </nav>

      <div className="rivalry-results">
        {!selectedPlayer ? (
          <p className="page-message">Escolha um treinador para ver os confrontos diretos.</p>
        ) : (
          <>
            <h2>{displayRivalryPlayer(selectedPlayer)} <span>vs.</span></h2>
            {comparisons.length === 0 ? (
              <p className="page-message">Não há confrontos registrados para este treinador.</p>
            ) : (
              <div className="scroll rivalry-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Resultado</th>
                      <th>Adversário</th>
                      <th>Vitórias</th>
                      <th>Derrotas</th>
                      <th>Empates</th>
                      <th>Gols pró</th>
                      <th>Gols contra</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((record) => (
                      <tr key={record.opponent}>
                        <td className={`rivalry-status ${record.status.toLowerCase()}`}>{record.status}</td>
                        <td>{displayRivalryPlayer(record.opponent)}</td>
                        <td>{record.wins}</td>
                        <td>{record.losses}</td>
                        <td>{record.draws}</td>
                        <td>{record.goalsFor}</td>
                        <td>{record.goalsAgainst}</td>
                        <td>{record.goalsFor - record.goalsAgainst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Resenha({ players }: { players: RankingPlayer[] }) {
  const { matches, loading, error } = useRivalryMatches()
  const [selectedSeason, setSelectedSeason] = useState('all')

  const seasons = useMemo(() => [...new Set(
    matches.flatMap(({ season }) => season ? [season] : []),
  )].sort((a, b) => b.localeCompare(a, 'pt-BR', { numeric: true })), [matches])

  const filteredMatches = useMemo(
    () => selectedSeason === 'all'
      ? matches
      : matches.filter((match) => match.season === selectedSeason),
    [matches, selectedSeason],
  )

  const summary = useMemo(() => {
    const playerNames = new Set<string>()
    let goals = 0
    for (const match of filteredMatches) {
      playerNames.add(match.home_player)
      playerNames.add(match.away_player)
      goals += match.home_score + match.away_score
    }
    return {
      games: filteredMatches.length,
      goals,
      averageGoals: filteredMatches.length ? (goals / filteredMatches.length).toFixed(2) : '0,00',
      players: playerNames.size,
    }
  }, [filteredMatches])

  const topGames = useMemo(() => {
    return filteredMatches
      .map((match) => ({
        ...match,
        difference: Math.abs(match.home_score - match.away_score),
      }))
      .sort((a, b) => b.difference - a.difference || (b.home_score + b.away_score) - (a.home_score + a.away_score))
      .slice(0, 30)
  }, [filteredMatches])

  const playerBestGames = useMemo(() => {
    const winsByPlayer = new Map<string, Array<{
      arena17_id: number
      championship_name: string
      season: string | null
      opponent: string
      scoreFor: number
      scoreAgainst: number
      difference: number
    }>>()

    for (const match of filteredMatches) {
      if (match.home_score === match.away_score) continue
      const isHomeWinner = match.home_score > match.away_score
      const winner = isHomeWinner ? match.home_player : match.away_player
      const opponent = isHomeWinner ? match.away_player : match.home_player
      const scoreFor = isHomeWinner ? match.home_score : match.away_score
      const scoreAgainst = isHomeWinner ? match.away_score : match.home_score
      const games = winsByPlayer.get(winner) ?? []
      games.push({
        arena17_id: match.arena17_id,
        championship_name: match.championship_name,
        season: match.season,
        opponent,
        scoreFor,
        scoreAgainst,
        difference: scoreFor - scoreAgainst,
      })
      winsByPlayer.set(winner, games)
    }

    const rankedNames = [...new Set(players.map(({ player_key }) => canonicalRivalryPlayer(player_key)))]
    const rankOrder = new Map(rankedNames.map((name, index) => [name, index]))
    return [...winsByPlayer.entries()]
      .map(([player, games]) => ({
        player,
        games: games
          .sort((a, b) => b.difference - a.difference || b.scoreFor - a.scoreFor)
          .slice(0, 30),
      }))
      .sort((a, b) =>
        (rankOrder.get(a.player) ?? Number.MAX_SAFE_INTEGER) -
        (rankOrder.get(b.player) ?? Number.MAX_SAFE_INTEGER) ||
        displayRivalryPlayer(a.player).localeCompare(displayRivalryPlayer(b.player), 'pt-BR'),
      )
  }, [filteredMatches, players])

  if (loading) return <p className="page-message">Carregando estatísticas...</p>
  if (error) return <p className="page-message page-error">Não foi possível carregar as estatísticas: {error}</p>

  return (
    <div className="resenha-content">
      <div className="resenha-toolbar">
        <p>{selectedSeason === 'all' ? 'Todos os tempos' : `Temporada ${selectedSeason}`}</p>
        <label>
          <span>Filtrar temporada</span>
          <select value={selectedSeason} onChange={(event) => setSelectedSeason(event.target.value)}>
            <option value="all">Todos os tempos</option>
            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </label>
      </div>

      <div className="resenha-stats" aria-label="Estatísticas gerais">
        <div><span>Jogos</span><strong>{summary.games.toLocaleString('pt-BR')}</strong></div>
        <div><span>Gols</span><strong>{summary.goals.toLocaleString('pt-BR')}</strong></div>
        <div><span>Média de gols / jogo</span><strong>{summary.averageGoals.replace('.', ',')}</strong></div>
        <div><span>Treinadores</span><strong>{summary.players.toLocaleString('pt-BR')}</strong></div>
      </div>

      <div className="resenha-list-head">
        <div>
          <div className="eyebrow">As maiores diferenças de placar</div>
          <h3>Top 30 — Recolha os Cacos</h3>
        </div>
        <p>Jogos com a maior diferença de gols</p>
      </div>

      {topGames.length === 0 ? (
        <p className="page-message">Não há jogos com placar disponível neste período.</p>
      ) : (
        <div className="scroll rivalry-scroll resenha-scroll">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Campeonato</th>
                <th>Temporada</th>
                <th>Confronto</th>
                <th>Placar</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {topGames.map((match, index) => (
                <tr key={match.arena17_id}>
                  <td>{String(index + 1).padStart(2, '0')}</td>
                  <td>{match.championship_name}</td>
                  <td>{match.season ?? '—'}</td>
                  <td>{displayRivalryPlayer(match.home_player)} × {displayRivalryPlayer(match.away_player)}</td>
                  <td>{match.home_score} × {match.away_score}</td>
                  <td className="large-margin">{match.difference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="resenha-list-head best-games-head">
        <div>
          <div className="eyebrow">As maiores vitórias de cada treinador</div>
          <h3>Top 30 — Recolhas a favor</h3>
        </div>
        <p>Abra um treinador para ver seus melhores jogos</p>
      </div>

      {playerBestGames.length === 0 ? (
        <p className="page-message">Não há vitórias registradas neste período.</p>
      ) : (
        <div className="player-best-list">
          {playerBestGames.map(({ player, games }) => (
            <details key={player} className="player-best-item">
              <summary>
                <span>{displayRivalryPlayer(player)}</span>
                <span>{games.length} {games.length === 1 ? 'jogo' : 'jogos'}</span>
              </summary>
              <div className="scroll rivalry-scroll resenha-scroll best-games-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Adversário</th>
                      <th>Campeonato</th>
                      <th>Temporada</th>
                      <th>Placar</th>
                      <th>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game, index) => (
                      <tr key={game.arena17_id}>
                        <td>{String(index + 1).padStart(2, '0')}</td>
                        <td>{displayRivalryPlayer(game.opponent)}</td>
                        <td>{game.championship_name}</td>
                        <td>{game.season ?? '—'}</td>
                        <td>{game.scoreFor} × {game.scoreAgainst}</td>
                        <td className="large-margin">+{game.difference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

export function ArchivePage({ page, players }: ArchivePageProps) {
  return (
    <section className="section archive-page">
      <div className="section-head">
        <div>
          <div className="eyebrow">Arquivo WiFIW</div>
          <h2>{pageTitles[page]}</h2>
        </div>
        {page !== 'rivalidade' && page !== 'resenha' && <p className="hint">Em breve</p>}
      </div>
      {page === 'rivalidade'
        ? <Rivalidade players={players} />
        : page === 'resenha'
          ? <Resenha players={players} />
          : <p className="coming-soon">Em breve</p>}
    </section>
  )
}

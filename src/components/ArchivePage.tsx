import { useEffect, useMemo, useState } from 'react'
import type { RankingPlayer } from '../types'
import { supabase } from '../lib/supabase'
import { useChampionshipPositionStats } from '../hooks/useChampionshipPositionStats'
import { useChampionshipTitleSequences } from '../hooks/useChampionshipTitleSequences'
import { useSeasonChampionshipWins } from '../hooks/useSeasonChampionshipWins'
import {
  canonicalRivalryPlayer,
  displayRivalryPlayer,
  useRivalryMatches,
} from '../hooks/useRivalryMatches'

export type ArchivePageId = 'resenha' | 'rivalidade' | 'estatisticas' | 'gloria' | 'wifiw-para-sempre'

type ArchivePageProps = {
  page: ArchivePageId
  players: RankingPlayer[]
}

const pageTitles: Record<ArchivePageId, string> = {
  resenha: 'Recolhas',
  rivalidade: 'Rivalidade',
  estatisticas: 'Estatísticas',
  gloria: 'Glórias',
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

type PlayerMatchStats = {
  player: string
  goalsScored: number
  goalsConceded: number
  wins: number
  losses: number
  goalDifference: number
  draws: number
  top3: number
  top5: number
  z4: number
}

type PlayerStatKey =
  | 'goalsScored'
  | 'goalsConceded'
  | 'wins'
  | 'losses'
  | 'goalDifference'
  | 'draws'
  | 'top3'
  | 'top5'
  | 'z4'

const playerStatLists: Array<{ key: PlayerStatKey; title: string }> = [
  { key: 'wins', title: 'Vitórias' },
  { key: 'losses', title: 'Derrotas' },
  { key: 'draws', title: 'Empates' },
  { key: 'goalsScored', title: 'Gols pró' },
  { key: 'goalsConceded', title: 'Gols contra' },
  { key: 'goalDifference', title: 'Saldo de gols' },
  { key: 'top3', title: 'Top 3' },
  { key: 'top5', title: 'Top 5' },
  { key: 'z4', title: 'Z4' },
]

const funStatLists: Array<{ key: PlayerStatKey; title: string }> = [
  { key: 'wins', title: 'Vitórias' },
  { key: 'losses', title: 'Derrotas' },
  { key: 'draws', title: 'Empates' },
  { key: 'goalsScored', title: 'Gols pró' },
  { key: 'goalsConceded', title: 'Gols contra' },
  { key: 'goalDifference', title: 'Saldo de gols' },
]

function Estatisticas({ players }: { players: RankingPlayer[] }) {
  const { matches, loading, error } = useRivalryMatches()
  const { finishes, loading: finishesLoading, error: finishesError } = useChampionshipPositionStats()
  const { championTeams, loading: championTeamsLoading, error: championTeamsError } = useChampionshipTitleSequences()
  const { seasonWins, loading: seasonWinsLoading, error: seasonWinsError } = useSeasonChampionshipWins()
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

  const funStats = useMemo(() => {
    const seasonStats = new Map<string, Map<string, PlayerMatchStats>>()

    for (const match of matches) {
      if (!match.season) continue
      let statsByPlayer = seasonStats.get(match.season)
      if (!statsByPlayer) {
        statsByPlayer = new Map()
        seasonStats.set(match.season, statsByPlayer)
      }

      const getPlayerStats = (playerName: string) => {
        const player = canonicalRivalryPlayer(playerName)
        const current = statsByPlayer!.get(player)
        if (current) return current
        const initial: PlayerMatchStats = {
          player,
          goalsScored: 0,
          goalsConceded: 0,
          wins: 0,
          losses: 0,
          goalDifference: 0,
          draws: 0,
          top3: 0,
          top5: 0,
          z4: 0,
        }
        statsByPlayer!.set(player, initial)
        return initial
      }

      const home = getPlayerStats(match.home_player)
      const away = getPlayerStats(match.away_player)
      home.goalsScored += match.home_score
      home.goalsConceded += match.away_score
      away.goalsScored += match.away_score
      away.goalsConceded += match.home_score
      if (match.home_score === match.away_score) {
        home.draws += 1
        away.draws += 1
      } else if (match.home_score > match.away_score) {
        home.wins += 1
        away.losses += 1
      } else {
        away.wins += 1
        home.losses += 1
      }
    }

    for (const playersInSeason of seasonStats.values()) {
      for (const stats of playersInSeason.values()) {
        stats.goalDifference = stats.goalsScored - stats.goalsConceded
      }
    }

    const historicalOrder = new Map(
      players.map(({ player_key }, index) => [canonicalRivalryPlayer(player_key), index]),
    )
    const comparePlayers = (a: string, b: string) =>
      (historicalOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (historicalOrder.get(b) ?? Number.MAX_SAFE_INTEGER) ||
      displayRivalryPlayer(a).localeCompare(displayRivalryPlayer(b), 'pt-BR')

    return funStatLists.map(({ key, title }) => {
      const allPerformances = [...seasonStats.entries()]
        .flatMap(([season, playersInSeason]) => [...playersInSeason.values()].map((stats) => ({
          season,
          player: stats.player,
          value: stats[key],
        })))
        .sort((a, b) =>
          b.value - a.value ||
          b.season.localeCompare(a.season, 'pt-BR', { numeric: true }) ||
          comparePlayers(a.player, b.player),
        )
      const performances = allPerformances.slice(0, 20)
      const recordValue = allPerformances.length
        ? Math.max(...allPerformances.map(({ value }) => value))
        : 0
      const recordLeaders = allPerformances
        .filter(({ value }) => value === recordValue)
        .map(({ season, player }) => ({ season, player }))
      return { key, title, performances, recordValue, recordLeaders }
    })
  }, [matches, players])

  const rankings = useMemo(() => {
    const statsByPlayer = new Map<string, PlayerMatchStats>()
    const playerOrder: string[] = []
    const addPlayer = (name: string) => {
      const player = canonicalRivalryPlayer(name)
      if (statsByPlayer.has(player)) return statsByPlayer.get(player)!
      const stats: PlayerMatchStats = {
        player,
        goalsScored: 0,
        goalsConceded: 0,
        wins: 0,
        losses: 0,
        goalDifference: 0,
        draws: 0,
        top3: 0,
        top5: 0,
        z4: 0,
      }
      statsByPlayer.set(player, stats)
      playerOrder.push(player)
      return stats
    }

    for (const { player_key } of players) addPlayer(player_key)
    for (const match of filteredMatches) {
      const home = addPlayer(match.home_player)
      const away = addPlayer(match.away_player)
      home.goalsScored += match.home_score
      home.goalsConceded += match.away_score
      away.goalsScored += match.away_score
      away.goalsConceded += match.home_score
      if (match.home_score === match.away_score) {
        home.draws += 1
        away.draws += 1
      } else if (match.home_score > match.away_score) {
        home.wins += 1
        away.losses += 1
      } else {
        away.wins += 1
        home.losses += 1
      }
    }

    for (const finish of finishes) {
      if (selectedSeason !== 'all' && finish.season !== selectedSeason) continue
      const player = addPlayer(finish.player)
      player.top3 += finish.top3
      player.top5 += finish.top5
      player.z4 += finish.z4
    }

    for (const stats of statsByPlayer.values()) {
      stats.goalDifference = stats.goalsScored - stats.goalsConceded
    }

    const historicalOrder = new Map(playerOrder.map((player, index) => [player, index]))
    return Object.fromEntries(playerStatLists.map(({ key }) => [
      key,
      [...statsByPlayer.values()].sort((a, b) =>
        b[key] - a[key] ||
        (historicalOrder.get(a.player) ?? Number.MAX_SAFE_INTEGER) -
          (historicalOrder.get(b.player) ?? Number.MAX_SAFE_INTEGER) ||
        displayRivalryPlayer(a.player).localeCompare(displayRivalryPlayer(b.player), 'pt-BR'),
      ),
    ])) as Record<PlayerStatKey, PlayerMatchStats[]>
  }, [filteredMatches, finishes, players, selectedSeason])

  const topSeasonChampionshipWins = useMemo(() => {
    const historicalOrder = new Map(
      players.map(({ player_key }, index) => [canonicalRivalryPlayer(player_key), index]),
    )
    return [...seasonWins]
      .sort((a, b) =>
        b.wins - a.wins ||
        b.season.localeCompare(a.season, 'pt-BR', { numeric: true }) ||
        (historicalOrder.get(a.player) ?? Number.MAX_SAFE_INTEGER) -
          (historicalOrder.get(b.player) ?? Number.MAX_SAFE_INTEGER) ||
        displayRivalryPlayer(a.player).localeCompare(displayRivalryPlayer(b.player), 'pt-BR'),
      )
      .slice(0, 15)
  }, [players, seasonWins])

  if (loading || finishesLoading || championTeamsLoading || seasonWinsLoading) return <p className="page-message">Carregando estatísticas...</p>
  if (error || finishesError || championTeamsError || seasonWinsError) return <p className="page-message page-error">Não foi possível carregar as estatísticas: {error ?? finishesError ?? championTeamsError ?? seasonWinsError}</p>

  return (
    <div className="player-stats-content">
      <section className="fun-stats-panel" aria-labelledby="fun-stats-title">
        <div className="fun-stats-heading">
          <div>
            <div className="eyebrow">Recordes em uma temporada</div>
            <h3 id="fun-stats-title">Estatísticas divertidas</h3>
          </div>
          <p>O painel mostra os líderes de cada temporada e o recorde histórico; o filtro abaixo vale para as listas gerais.</p>
        </div>
        <div className="fun-stats-grid">
          {funStats.map(({ key, title, performances, recordValue, recordLeaders }) => (
            <section className="fun-stat-card" key={key}>
              <h4>{title}</h4>
              <div className="fun-stat-record">
                <span>Recorde de uma temporada</span>
                <strong>{recordValue > 0 && key === 'goalDifference' ? `+${recordValue}` : recordValue}</strong>
                <div>
                  {recordLeaders.map(({ season, player }) => (
                    <span key={`${season}-${player}`}>{displayRivalryPlayer(player)} · {season}</span>
                  ))}
                </div>
              </div>
              <div className="fun-season-leaders">
                {performances.map(({ season, player, value }) => (
                  <div className="fun-season-leader" key={`${season}-${player}`}>
                    <span>{season}</span>
                    <span>{displayRivalryPlayer(player)}</span>
                    <strong>{value > 0 && key === 'goalDifference' ? `+${value}` : value}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <section className="champion-team-stats" aria-labelledby="champion-team-stats-title">
          <div className="resenha-list-head">
            <div>
              <div className="eyebrow">Clubes vencedores</div>
              <h4 id="champion-team-stats-title">Times campeões</h4>
            </div>
          </div>
          <div className="scroll rivalry-scroll champion-team-stats-scroll">
            <table>
              <thead>
                <tr><th>Pos.</th><th>Time</th><th>Títulos</th><th>Treinadores campeões</th></tr>
              </thead>
              <tbody>
                {championTeams.map(({ team, titles, players: teamPlayers }, index) => (
                  <tr key={team}>
                    <td>{String(index + 1).padStart(2, '0')}</td>
                    <td>{team}</td>
                    <td>{titles}</td>
                    <td className="champion-team-coaches">
                      {[...teamPlayers]
                        .sort((a, b) => displayRivalryPlayer(a).localeCompare(displayRivalryPlayer(b), 'pt-BR'))
                        .map(displayRivalryPlayer)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="season-title-tops title-streaks" aria-labelledby="season-title-tops-title">
        <div className="resenha-list-head">
          <div>
            <div className="eyebrow">Mais campeonatos vencidos em uma temporada</div>
            <h3 id="season-title-tops-title">Top 15 de títulos por temporada</h3>
          </div>
        </div>
        {topSeasonChampionshipWins.length === 0 ? (
          <p className="page-message">Não há títulos por temporada registrados.</p>
        ) : (
          <div className="scroll rivalry-scroll season-title-tops-scroll">
            <table>
              <thead>
                <tr><th>Pos.</th><th>Treinador</th><th>Títulos na temporada</th><th>Times</th><th>Temporada</th></tr>
              </thead>
              <tbody>
                {topSeasonChampionshipWins.map(({ player, season, wins, championships }, index) => (
                  <tr key={`${player}-${season}`}>
                    <td>{String(index + 1).padStart(2, '0')}</td>
                    <td>{displayRivalryPlayer(player)}</td>
                    <td>{wins}</td>
                    <td className="season-title-winner-teams">
                      <ol className="title-streak-championships">
                        {championships.map(({ name, team }, championshipIndex) => (
                          <li key={`${name}-${championshipIndex}`}>
                            {name}{team && <> - <span className="title-streak-championship-team">{team}</span></>}
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td>{season}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

      <div className="player-stats-grid">
        {playerStatLists.map(({ key, title }) => (
          <section className="player-stat-card" key={key}>
            <h3>{title}</h3>
            <div className="scroll player-stat-scroll">
              <table>
                <thead>
                  <tr><th>Pos.</th><th>Treinador</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {rankings[key].map((record, index) => (
                    <tr key={record.player}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>{displayRivalryPlayer(record.player)}</td>
                      <td>{record[key] > 0 && key === 'goalDifference' ? `+${record[key].toLocaleString('pt-BR')}` : record[key].toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

type ChampionshipTitle = {
  championshipId: number
  championshipName: string
  season: string | null
  champion: string
  team: string | null
}

function Glorias({ players }: { players: RankingPlayer[] }) {
  const { sequences, loading: sequencesLoading, error: sequencesError } = useChampionshipTitleSequences()
  const [titles, setTitles] = useState<ChampionshipTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadTitles() {
      const { data, error: queryError } = await supabase
        .from('wifiw_championships')
        .select('arena17_id,name,status,champion_player,champion_team')
        .order('arena17_id', { ascending: true })

      if (queryError) throw queryError

      const result = (data ?? []).flatMap((championship) => {
        if (championship.status !== 'finalizado' || !championship.champion_player) return []
        const seasonMatch = championship.name.match(/(20\d{2})\/(20\d{2})/)
        return [{
          championshipId: championship.arena17_id,
          championshipName: championship.name,
          season: seasonMatch ? `${seasonMatch[1]}/${seasonMatch[2]}` : null,
          champion: canonicalRivalryPlayer(championship.champion_player),
          team: championship.champion_team,
        }]
      })

      if (!cancelled) {
        setTitles(result)
        setLoading(false)
      }
    }

    loadTitles().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const coaches = useMemo(() => {
    const titlesByCoach = new Map<string, ChampionshipTitle[]>()
    for (const title of titles) {
      const records = titlesByCoach.get(title.champion) ?? []
      records.push(title)
      titlesByCoach.set(title.champion, records)
    }

    const rankedNames = [...new Set(players.map(({ player_key }) => canonicalRivalryPlayer(player_key)))]
    const coachesInOrder = rankedNames.map((player) => ({ player, position: players.find(
      ({ player_key }) => canonicalRivalryPlayer(player_key) === player,
    )?.position ?? null }))
    const rankedSet = new Set(rankedNames)
    const unrankedCoaches = [...titlesByCoach.keys()]
      .filter((player) => !rankedSet.has(player))
      .sort((a, b) => (titlesByCoach.get(b)?.length ?? 0) - (titlesByCoach.get(a)?.length ?? 0))
      .map((player) => ({ player, position: null }))

    return [...coachesInOrder, ...unrankedCoaches].map(({ player, position }) => ({
      player,
      position,
      titles: (titlesByCoach.get(player) ?? []).sort((a, b) => {
        const yearOrder = (b.season ?? '').localeCompare(a.season ?? '', 'pt-BR', { numeric: true })
        return yearOrder || b.championshipId - a.championshipId
      }),
    }))
  }, [players, titles])

  if (loading || sequencesLoading) return <p className="page-message">Carregando títulos...</p>
  if (error || sequencesError) return <p className="page-message page-error">Não foi possível carregar os títulos: {error ?? sequencesError}</p>

  return (
    <div className="glorias-content">
      <div className="glorias-intro">
        <div className="eyebrow">Histórico de campeões</div>
        <p>Treinadores em ordem da classificação histórica, com seus títulos e os times que comandaram.</p>
      </div>
      <div className="glorias-list">
        {coaches.map(({ player, position, titles: coachTitles }, index) => (
          <article className="gloria-coach" key={player}>
            <div className="gloria-coach-head">
              <span className="gloria-position">{String(position ?? index + 1).padStart(2, '0')}</span>
              <h3>{displayRivalryPlayer(player)}</h3>
              <span className="gloria-title-count">
                {coachTitles.length} {coachTitles.length === 1 ? 'título' : 'títulos'}
              </span>
            </div>
            {coachTitles.length > 0 ? (
              <ul className="gloria-titles">
                {coachTitles.map((title) => (
                  <li key={title.championshipId}>
                    <strong>{title.season ?? 'Ano não informado'}</strong>
                    <span>{title.championshipName}</span>
                    <span className="gloria-team">{title.team ?? 'Time não informado'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="gloria-no-titles">Nenhum título registrado.</p>
            )}
          </article>
        ))}
      </div>
      <section className="title-streaks" aria-labelledby="title-streaks-title">
        <div className="resenha-list-head">
          <div>
            <div className="eyebrow">Campeões consecutivos</div>
            <h3 id="title-streaks-title">Sequências de títulos</h3>
          </div>
          <p>Maior sequência primeiro</p>
        </div>
        {sequences.length === 0 ? (
          <p className="page-message">Não há sequências de títulos consecutivos registradas.</p>
        ) : (
          <div className="scroll rivalry-scroll title-streaks-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Treinador</th>
                  <th>Seguidos</th>
                  <th>Campeonatos</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((sequence, index) => (
                  <tr key={`${sequence.firstId}-${sequence.lastId}`}>
                    <td>{String(index + 1).padStart(2, '0')}</td>
                    <td>{displayRivalryPlayer(sequence.champion)}</td>
                    <td>{sequence.length}</td>
                    <td>
                      <ol className="title-streak-championships">
                        {sequence.championships.map(({ name, team }, championshipIndex) => (
                          <li key={`${sequence.firstId}-${championshipIndex}`}>
                            <span>
                              {name}
                              {team && <> - <span className="title-streak-championship-team">{team}</span></>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
        {page !== 'rivalidade' && page !== 'resenha' && page !== 'estatisticas' && page !== 'gloria' && <p className="hint">Em breve</p>}
      </div>
      {page === 'rivalidade'
        ? <Rivalidade players={players} />
        : page === 'resenha'
          ? <Resenha players={players} />
          : page === 'estatisticas'
            ? <Estatisticas players={players} />
            : page === 'gloria'
              ? <Glorias players={players} />
              : <p className="coming-soon">Em breve</p>}
    </section>
  )
}

import type { MetricKey, RankingPlayer, Season } from '../types'

type RankingTableProps = {
  seasons: Season[]
  players: RankingPlayer[]
  metric: MetricKey
  view: 'general' | 'yearByYear'
}

function seasonValue(player: RankingPlayer, season: string, metric: MetricKey) {
  return metric === 'seasonTitles'
    ? player.season_titles[season]
    : player.season_points[season]
}

function renderSeasonCell(value: number | null | undefined, metric: MetricKey) {
  if (value === null || value === undefined) {
    return <span className="season-empty">—</span>
  }

  if (metric === 'seasonPoints') {
    if (value === 10) {
      return (
        <span className="medal-badge medal-gold" title="1º lugar (10 pts)">
          10
        </span>
      )
    }
    if (value === 8) {
      return (
        <span className="medal-badge medal-silver" title="2º lugar (8 pts)">
          8
        </span>
      )
    }
    if (value === 6) {
      return (
        <span className="medal-badge medal-bronze" title="3º lugar (6 pts)">
          6
        </span>
      )
    }
  }

  return <span className="season-val">{value}</span>
}

export function RankingTable({ seasons, players, metric, view }: RankingTableProps) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th className="column-position">Pos.</th>
            <th className="column-coach">Treinador</th>
            <th className="column-total">Total</th>
            <th className="column-crowns">Corrida 🏆</th>
            {view === 'general' ? (
              <>
                <th>Títulos</th>
                <th>2ºs</th>
                <th>3ºs</th>
                <th>Z4</th>
                <th>Campeonatos</th>
              </>
            ) : seasons.map(({ season }) => (
              <th key={season} className="th-season">
                {season}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.player_key}>
              <td className="column-position">{String(player.position).padStart(2, '0')}</td>
              <td className="column-coach">
                {player.player}
                {player.crowns > 0 ? ` ${'🏆'.repeat(player.crowns)}` : ''}
              </td>
              <td className="column-total">{player.total_points}</td>
              <td className="column-crowns">{player.crowns}</td>
              {view === 'general' ? (
                <>
                  <td>{player.titles}</td>
                  <td>{player.second_places}</td>
                  <td>{player.third_places}</td>
                  <td>{player.bottom_four_finishes}</td>
                  <td>{player.championships_played}</td>
                </>
              ) : seasons.map(({ season }) => {
                const value = seasonValue(player, season, metric)
                return (
                  <td key={season} className="season">
                    {renderSeasonCell(value, metric)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

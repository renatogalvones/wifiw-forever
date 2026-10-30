import type {
  ChampionshipRecord,
  ChampionshipTableRecord,
  RankingChampionship,
  RankingPlayer,
  RankingRecord,
  Season,
} from '../types'

export const POSITION_POINTS = [10, 8, 6, 5, 4, 3, 2, 1]

export const LEGACY_SEASONS_ORDER: Season[] = [
  { season: '23/24', sort_order: 2023 },
  { season: '22/23', sort_order: 2022 },
  { season: '21/22', sort_order: 2021 },
  { season: '20/21', sort_order: 2020 },
  { season: '19/20', sort_order: 2019 },
  { season: '18/19', sort_order: 2018 },
  { season: '17/18', sort_order: 2017 },
  { season: '16/17', sort_order: 2016 },
  { season: '15/16', sort_order: 2015 },
  { season: '14/15', sort_order: 2014 },
  { season: '13/14', sort_order: 2013 },
]

export const PLAYER_NICKNAMES: Record<string, string> = {
  Galvanildo_Oliveira: 'Galvanildo Oliveira',
  Diegol_Oliveira: 'Diegol',
  Rodrigol_Oliveira: 'Rodrigol',
  Marcel_Chamusca: 'Chamusca',
  vitor_zagallo: 'Vitinho',
  Marcel_Frescolari: 'Fresco',
  Vini_Mancini: 'Vini',
  Jaderley_Luxemburgo: 'Jader',
  Zico_Correa: 'Zico',
  Bato_Valentim: 'Batô',
  Marcello_Lippi: 'Marcello',
  James_Bielsa: 'James',
  Max_Jacozinho: 'Max Jacozinho',
  richard_hideki: 'Richard',
  Mijador: 'Cassio',
  Cassetin: 'Cassio',
  toni_sanches: 'Toni',
  Thiago_Allegri: 'Thigato',
  AndisuLopeS: 'Andisu',
  diego_Jardine: 'Jardine',
  pedro_guardiola: 'Pedro Tucunduva',
  bruno_vamp: 'Bruno Vamp',
  Brunno_Pochetetta: 'Tetta',
  Chocovao_Borges: 'Choco',
}

export const LEGACY_CHAMPIONSHIPS_PLAYED: Record<string, number> = {
  vitor_zagallo: 129,
  Thiago_Allegri: 123,
  Marcel_Frescolari: 108,
  Galvanildo_Oliveira: 99,
  Zico_Correa: 93,
  Rodrigol_Oliveira: 92,
  Jaderley_Luxemburgo: 90,
  Cassetin: 80,
  Mijador: 80,
  Marcello_Lippi: 78,
  toni_sanches: 70,
  Marcel_Chamusca: 63,
  Diegol_Oliveira: 60,
  bruno_vamp: 48,
  Bato_Valentim: 47,
  diego_Jardine: 41,
  Brunno_Pochetetta: 36,
  Chocovao_Borges: 31,
  richard_hideki: 22,
  Pedro_Barbieri: 19,
  James_Bielsa: 18,
  Enzot115: 14,
  pedro_guardiola: 13,
  Raphael_Tufao: 11,
  Max_Jacozinho: 10,
  Vini_Mancini: 8,
  Luis_Enricuca: 8,
  rodrigomq: 8,
  dtsjean: 5,
  Brooklynsul: 5,
  AndisuLopeS: 3,
  Eduardo_diniz: 4,
  Jp_gareca: 4,
  victorpiaz: 4,
  Caio_Ceni: 3,
  Felipe_Ferreira: 3,
  Gabriel_Pelanza: 3,
  Vigvida1: 1,
  Caioberto: 1,
  Chupeta_Ventura: 1,
}

const PLAYER_KEYS = Object.keys(PLAYER_NICKNAMES).sort((a, b) => b.length - a.length)

function playerKeyFromStanding(row: string[]): string | null {
  const candidates = row.slice(1).filter(Boolean).join(' ')
  return PLAYER_KEYS.find((key) => candidates.includes(key)) ?? null
}

function championshipStandings(rows: string[][]): Array<{ player: string; position: number }> {
  const headerIndex = rows.findIndex((row) =>
    row[0]?.toLocaleUpperCase().includes('CLASSIFICAÇÃO'),
  )
  if (headerIndex < 0) return []

  const header = rows[headerIndex][0].toLocaleUpperCase()
  // A group table is not the final placement for a groups + playoffs tournament.
  if (header.includes('GRUPO')) return []

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const position = Number(row[0])
    const player = playerKeyFromStanding(row)
    return Number.isInteger(position) && position > 0 && player
      ? [{ player, position }]
      : []
  })
}

/** Build the legacy input from fetched championship tables, preserving Arena17's final positions. */
export function calculateLegacyRankingFromChampionships(
  championships: ChampionshipRecord[],
  rankingLinks: RankingChampionship[],
  rankings: RankingRecord[],
  tables: ChampionshipTableRecord[],
): { seasons: Season[]; players: RankingPlayer[] } {
  const rankingById = new Map(rankings.map((ranking) => [ranking.arena17_id, ranking]))
  const tablesByChampionship = new Map<number, string[][][]>()
  for (const table of tables) {
    const records = tablesByChampionship.get(table.championship_id) ?? []
    records.push(table.rows)
    tablesByChampionship.set(table.championship_id, records)
  }

  const linksByChampionship = new Map<number, RankingRecord[]>()
  for (const link of rankingLinks) {
    const ranking = rankingById.get(link.ranking_id)
    if (!ranking) continue
    const records = linksByChampionship.get(link.championship_id) ?? []
    records.push(ranking)
    linksByChampionship.set(link.championship_id, records)
  }

  const pointsByPlayer = new Map<string, Record<string, number>>()
  const titlesByPlayer = new Map<string, Record<string, number>>()
  const allTitlesByPlayer = new Map<string, number>()
  const allSecondPlacesByPlayer = new Map<string, number>()
  const allThirdPlacesByPlayer = new Map<string, number>()
  const allBottomFourFinishesByPlayer = new Map<string, number>()
  const playedByPlayer = new Map<string, number>()
  const seasonsByName = new Map<string, Season>()
  const seasonRegex = /(20\d{2})\/(20\d{2})/

  for (const championship of championships) {
    if (championship.status !== 'finalizado') continue
    const rawChampion = championship.champion_player
    const champion = rawChampion
      ? (PLAYER_KEYS.find((key) => key === rawChampion) ?? rawChampion)
      : null
    if (champion) {
      allTitlesByPlayer.set(champion, (allTitlesByPlayer.get(champion) ?? 0) + 1)
    }

    const allStandings = (tablesByChampionship.get(championship.arena17_id) ?? [])
      .map(championshipStandings)
      .find((rows) => rows.length > 0) ?? []
    const lastPosition = Math.max(...allStandings.map(({ position }) => position), 0)
    for (const standing of allStandings) {
      if (standing.position === 2) {
        allSecondPlacesByPlayer.set(standing.player, (allSecondPlacesByPlayer.get(standing.player) ?? 0) + 1)
      } else if (standing.position === 3) {
        allThirdPlacesByPlayer.set(standing.player, (allThirdPlacesByPlayer.get(standing.player) ?? 0) + 1)
      }
      if (standing.position > lastPosition - 4) {
        allBottomFourFinishesByPlayer.set(
          standing.player,
          (allBottomFourFinishesByPlayer.get(standing.player) ?? 0) + 1,
        )
      }
    }

    const seasons = linksByChampionship.get(championship.arena17_id) ?? []
    const tableSets = tablesByChampionship.get(championship.arena17_id) ?? []
    const standings = tableSets.map(championshipStandings).find((rows) => rows.length > 0)
    if (!standings) continue

    for (const ranking of seasons) {
      const match = ranking.name.match(seasonRegex)
      if (!match || Number(match[1]) > 2023) continue
      const season = `${match[1].slice(-2)}/${match[2].slice(-2)}`
      seasonsByName.set(season, { season, sort_order: Number(match[1]) })
      const points = ranking.championship_points_by_position ?? POSITION_POINTS
      for (const { player, position } of standings) {
        const playerPoints = pointsByPlayer.get(player) ?? {}
        playerPoints[season] = (playerPoints[season] ?? 0) + (points[position - 1] ?? 0)
        pointsByPlayer.set(player, playerPoints)
        playedByPlayer.set(player, (playedByPlayer.get(player) ?? 0) + 1)
      }
      if (champion) {
        const playerTitles = titlesByPlayer.get(champion) ?? {}
        playerTitles[season] = (playerTitles[season] ?? 0) + 1
        titlesByPlayer.set(champion, playerTitles)
      }
    }
  }

  const allPlayerKeys = new Set([
    ...pointsByPlayer.keys(),
    ...allTitlesByPlayer.keys(),
    ...allSecondPlacesByPlayer.keys(),
    ...allThirdPlacesByPlayer.keys(),
    ...allBottomFourFinishesByPlayer.keys(),
  ])
  const rawPlayers: RankingPlayer[] = [...allPlayerKeys].map((player_key) => ({
    player_key,
    player: formatPlayerDisplayName(player_key),
    position: 0,
    total_points: 0,
    average: 0,
    crowns: 0,
    titles: 0,
    second_places: allSecondPlacesByPlayer.get(player_key) ?? 0,
    third_places: allThirdPlacesByPlayer.get(player_key) ?? 0,
    bottom_four_finishes: allBottomFourFinishesByPlayer.get(player_key) ?? 0,
    championships_played: playedByPlayer.get(player_key) ?? 0,
    seasons_played: 0,
    season_points: pointsByPlayer.get(player_key) ?? {},
    season_titles: titlesByPlayer.get(player_key) ?? {},
  })).map((player) => ({
    ...player,
    titles: allTitlesByPlayer.get(player.player_key) ?? 0,
  }))

  return calculateLegacyRanking(rawPlayers, [...seasonsByName.values()])
}

function cleanPlayerName(name: string): string {
  return name.replace(/\*+$/g, '').trim()
}

export function formatPlayerDisplayName(key: string, currentName?: string): string {
  if (PLAYER_NICKNAMES[key]) {
    return PLAYER_NICKNAMES[key]
  }
  if (currentName) {
    const cleaned = cleanPlayerName(currentName)
    if (PLAYER_NICKNAMES[cleaned]) {
      return PLAYER_NICKNAMES[cleaned]
    }
    return cleaned
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Calculates legacy ranking based on season rankings:
 * 1st -> 10, 2nd -> 8, 3rd -> 6, 4th -> 5, 5th -> 4, 6th -> 3, 7th -> 2, 8th -> 1, >=9th -> 0.
 * Non-participants receive null ('-').
 */
export function calculateLegacyRanking(
  rawPlayers: RankingPlayer[],
  availableSeasons?: Season[],
): { seasons: Season[]; players: RankingPlayer[] } {
  const seasons =
    availableSeasons && availableSeasons.length > 0
      ? [...availableSeasons]
          .filter((s) => {
            const startYear = parseInt(s.season.split('/')[0], 10)
            return startYear <= 23 && startYear >= 13
          })
          .sort((a, b) => b.sort_order - a.sort_order)
      : LEGACY_SEASONS_ORDER

  const seasonKeys = seasons.map((s) => s.season)

  // Map each player's season points to season ranking points (10, 8, 6, 5, 4, 3, 2, 1, 0)
  const computedSeasonPoints: Record<string, Record<string, number | null>> = {}
  rawPlayers.forEach((p) => {
    computedSeasonPoints[p.player_key] = {}
  })

  for (const s of seasonKeys) {
    // Collect all players who participated in season `s`
    const participants: {
      playerKey: string
      rawPoints: number
      titles: number
      playerName: string
    }[] = []

    for (const p of rawPlayers) {
      const rawPoints = p.season_points ? p.season_points[s] : null
      if (rawPoints !== null && rawPoints !== undefined) {
        participants.push({
          playerKey: p.player_key,
          rawPoints: Number(rawPoints),
          titles: Number(p.season_titles?.[s] ?? 0),
          playerName: p.player,
        })
      }
    }

    // Check if the points in this season are already ranking points (max <= 10 and positions pattern)
    // or if they are raw championship points (sum can be > 10)
    const isAlreadyRankingPoints =
      participants.length > 0 &&
      participants.every((p) => p.rawPoints <= 10 && p.rawPoints >= 0) &&
      participants.some((p) => p.rawPoints === 10)

    if (isAlreadyRankingPoints) {
      participants.forEach((p) => {
        computedSeasonPoints[p.playerKey][s] = p.rawPoints
      })
    } else {
      // Sort participants by raw points first; titles break ties (championship victories), then name
      participants.sort(
        (a, b) =>
          b.rawPoints - a.rawPoints ||
          b.titles - a.titles ||
          a.playerName.localeCompare(b.playerName),
      )

      participants.forEach((p, idx) => {
        const pts = idx < POSITION_POINTS.length ? POSITION_POINTS[idx] : 0
        computedSeasonPoints[p.playerKey][s] = pts
      })
    }

    // Mark non-participants as null
    for (const p of rawPlayers) {
      if (computedSeasonPoints[p.player_key][s] === undefined) {
        computedSeasonPoints[p.player_key][s] = null
      }
    }
  }

  // Calculate totals, averages, crowns, and titles for each player
  const playersWithTotals: RankingPlayer[] = rawPlayers
    .map((p) => {
      const playerSeasonPoints = computedSeasonPoints[p.player_key] || {}
      const playerSeasonTitles: Record<string, number | null> = {}

      let totalPoints = 0
      let seasonsPlayed = 0
      let crowns = 0
      let titles = 0

      for (const s of seasonKeys) {
        const pts = playerSeasonPoints[s]
        if (pts !== null && pts !== undefined) {
          totalPoints += pts
          seasonsPlayed += 1
          if (pts === 10) {
            crowns += 1
          }
        }

        const t = p.season_titles ? p.season_titles[s] : null
        if (t !== null && t !== undefined) {
          playerSeasonTitles[s] = Number(t)
          titles += Number(t)
        } else {
          playerSeasonTitles[s] = null
        }
      }

      const average = seasonsPlayed > 0 ? Number((totalPoints / seasonsPlayed).toFixed(2)) : 0

      return {
        player_key: p.player_key,
        player: formatPlayerDisplayName(p.player_key, p.player),
        position: 0,
        total_points: totalPoints,
        average,
        crowns,
        titles: Math.max(titles, Number(p.titles ?? 0)),
        second_places: Number(p.second_places ?? 0),
        third_places: Number(p.third_places ?? 0),
        bottom_four_finishes: Number(p.bottom_four_finishes ?? 0),
        championships_played:
          Number(p.championships_played) ||
          LEGACY_CHAMPIONSHIPS_PLAYED[p.player_key] ||
          0,
        seasons_played: seasonsPlayed,
        season_points: playerSeasonPoints,
        season_titles: playerSeasonTitles,
      }
    })
    .filter((p) => p.seasons_played > 0) // only include players who played in at least one legacy season

  // Sort players:
  // 1. Crowns (Títulos Gerais ★) DESC
  // 2. Titles (Total championship titles) DESC
  // 3. Total Points DESC
  // 4. Average DESC
  // 5. Name ASC
  playersWithTotals.sort((a, b) => {
    if (b.crowns !== a.crowns) return b.crowns - a.crowns
    if (b.titles !== a.titles) return b.titles - a.titles
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    const aAvg = Number(a.average) || 0
    const bAvg = Number(b.average) || 0
    if (bAvg !== aAvg) return bAvg - aAvg
    return a.player.localeCompare(b.player)
  })

  // Assign position 1, 2, 3...
  playersWithTotals.forEach((p, idx) => {
    p.position = idx + 1
  })

  return {
    seasons,
    players: playersWithTotals,
  }
}

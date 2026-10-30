export type Season = {
  season: string
  sort_order: number
}

export type RankingPlayer = {
  player_key: string
  player: string
  position: number
  total_points: number
  average: number | string | null
  crowns: number
  titles: number
  second_places: number
  third_places: number
  bottom_four_finishes: number
  championships_played: number
  seasons_played: number
  season_points: Record<string, number | null>
  season_titles: Record<string, number | null>
}

export type SortKey = 'position' | 'crowns' | 'titles' | 'points' | 'championships' | 'average'

export type MetricKey = 'seasonPoints' | 'seasonTitles'

export type ChampionshipRecord = {
  arena17_id: number
  name: string
  status: string | null
  champion_player: string | null
}

export type RankingChampionship = {
  ranking_id: number
  championship_id: number
}

export type RankingRecord = {
  arena17_id: number
  name: string
  championship_points_by_position: number[] | null
}

export type ChampionshipTableRecord = {
  championship_id: number
  rows: string[][]
}

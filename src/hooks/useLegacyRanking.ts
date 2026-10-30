import { useEffect, useState } from 'react'
import { calculateLegacyRankingFromChampionships } from '../lib/calculateRanking'
import { supabase } from '../lib/supabase'
import type {
  ChampionshipRecord,
  ChampionshipTableRecord,
  RankingChampionship,
  RankingRecord,
  RankingPlayer,
  Season,
} from '../types'

type LegacyRankingState = {
  seasons: Season[]
  players: RankingPlayer[]
  loading: boolean
  error: string | null
}

export function useLegacyRanking(): LegacyRankingState {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<RankingPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [championships, rankingLinks, rankings, tables] = await Promise.all([
        supabase.from('wifiw_championships').select('arena17_id,name,status,champion_player'),
        supabase.from('wifiw_ranking_championships').select('ranking_id,championship_id'),
        supabase.from('wifiw_rankings').select('arena17_id,name,championship_points_by_position'),
        supabase.from('wifiw_championship_tables').select('championship_id,rows'),
      ])

      if (cancelled) return

      const queryError = championships.error ?? rankingLinks.error ?? rankings.error ?? tables.error
      if (queryError) {
        setError(queryError.message ?? 'Erro desconhecido ao carregar a classificação.')
        setLoading(false)
        return
      }

      const calculated = calculateLegacyRankingFromChampionships(
        (championships.data ?? []) as ChampionshipRecord[],
        (rankingLinks.data ?? []) as RankingChampionship[],
        (rankings.data ?? []) as RankingRecord[],
        (tables.data ?? []) as ChampionshipTableRecord[],
      )
      setSeasons(calculated.seasons)
      setPlayers(calculated.players)
      setLoading(false)
    }

    load().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { seasons, players, loading, error }
}

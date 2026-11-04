import { useEffect, useState } from 'react'
import type { ChampionshipRecord, RankingChampionship, RankingRecord } from '../types'
import { canonicalRivalryPlayer } from './useRivalryMatches'
import { supabase } from '../lib/supabase'

export type SeasonChampionshipWins = {
  player: string
  season: string
  wins: number
  championships: Array<{ name: string; team: string | null }>
}

type SeasonWinnerChampionship = ChampionshipRecord & {
  champion_team: string | null
}

type SeasonChampionshipWinsState = {
  seasonWins: SeasonChampionshipWins[]
  loading: boolean
  error: string | null
}

const seasonPattern = /(20\d{2})\/(20\d{2})/

export function useSeasonChampionshipWins(): SeasonChampionshipWinsState {
  const [seasonWins, setSeasonWins] = useState<SeasonChampionshipWins[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSeasonWins() {
      const [championshipsResult, linksResult, rankingsResult] = await Promise.all([
        supabase.from('wifiw_championships').select('arena17_id,name,status,champion_player,champion_team'),
        supabase.from('wifiw_ranking_championships').select('ranking_id,championship_id'),
        supabase.from('wifiw_rankings').select('arena17_id,name'),
      ])

      const queryError = championshipsResult.error ?? linksResult.error ?? rankingsResult.error
      if (queryError) throw queryError

      const championships = (championshipsResult.data ?? []) as SeasonWinnerChampionship[]
      const links = (linksResult.data ?? []) as RankingChampionship[]
      const rankings = (rankingsResult.data ?? []) as Pick<RankingRecord, 'arena17_id' | 'name'>[]

      const seasonByRanking = new Map<number, string>()
      for (const ranking of rankings) {
        const match = ranking.name.match(seasonPattern)
        if (match) seasonByRanking.set(ranking.arena17_id, `${match[1]}/${match[2]}`)
      }

      const seasonByChampionship = new Map<number, string>()
      for (const link of links) {
        const season = seasonByRanking.get(link.ranking_id)
        if (season) seasonByChampionship.set(link.championship_id, season)
      }
      for (const championship of championships) {
        if (seasonByChampionship.has(championship.arena17_id)) continue
        const match = championship.name.match(seasonPattern)
        if (match) seasonByChampionship.set(championship.arena17_id, `${match[1]}/${match[2]}`)
      }

      const winsByPlayerSeason = new Map<string, SeasonChampionshipWins>()
      for (const championship of championships) {
        if (championship.status !== 'finalizado' || !championship.champion_player) continue
        const season = seasonByChampionship.get(championship.arena17_id)
        if (!season) continue
        const player = canonicalRivalryPlayer(championship.champion_player)
        const key = `${player}\u0000${season}`
        const record = winsByPlayerSeason.get(key) ?? { player, season, wins: 0, championships: [] }
        record.wins += 1
        record.championships.push({ name: championship.name, team: championship.champion_team })
        winsByPlayerSeason.set(key, record)
      }

      if (!cancelled) {
        setSeasonWins([...winsByPlayerSeason.values()])
        setLoading(false)
      }
    }

    loadSeasonWins().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { seasonWins, loading, error }
}

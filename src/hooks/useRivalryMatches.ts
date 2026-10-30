import { useEffect, useState } from 'react'
import { formatPlayerDisplayName } from '../lib/calculateRanking'
import { supabase } from '../lib/supabase'

export type RivalryMatch = {
  arena17_id: number
  championship_id: number
  championship_name: string
  season: string | null
  home_player: string
  away_player: string
  home_score: number
  away_score: number
}

type RivalryState = {
  matches: RivalryMatch[]
  loading: boolean
  error: string | null
}

export function canonicalRivalryPlayer(name: string): string {
  const cleanName = name.trim()
  return cleanName === 'Mijador' ? 'Cassetin' : cleanName
}

export function displayRivalryPlayer(name: string): string {
  return formatPlayerDisplayName(canonicalRivalryPlayer(name))
}

export function useRivalryMatches(): RivalryState {
  const [matches, setMatches] = useState<RivalryMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMatches() {
      const pageSize = 1000
      const fetched: RivalryMatch[] = []
      let offset = 0
      const [rankingLinksResult, rankingsResult, championshipsResult] = await Promise.all([
        supabase.from('wifiw_ranking_championships').select('ranking_id,championship_id'),
        supabase.from('wifiw_rankings').select('arena17_id,name'),
        supabase.from('wifiw_championships').select('arena17_id,name'),
      ])

      const metadataError = rankingLinksResult.error ?? rankingsResult.error ?? championshipsResult.error
      if (metadataError) throw metadataError

      const rankingSeasonById = new Map<number, string>()
      for (const ranking of rankingsResult.data ?? []) {
        const match = ranking.name.match(/(20\d{2})\/(20\d{2})/)
        if (match) rankingSeasonById.set(ranking.arena17_id, `${match[1]}/${match[2]}`)
      }
      const seasonByChampionship = new Map<number, string>()
      const championshipNameById = new Map<number, string>()
      for (const link of rankingLinksResult.data ?? []) {
        const season = rankingSeasonById.get(link.ranking_id)
        if (season) seasonByChampionship.set(link.championship_id, season)
      }
      for (const championship of championshipsResult.data ?? []) {
        championshipNameById.set(championship.arena17_id, championship.name)
        if (seasonByChampionship.has(championship.arena17_id)) continue
        const match = championship.name.match(/(20\d{2})\/(20\d{2})/)
        if (match) seasonByChampionship.set(championship.arena17_id, `${match[1]}/${match[2]}`)
      }

      while (true) {
        const { data, error: queryError } = await supabase
          .from('wifiw_matches')
          .select('arena17_id,championship_id,home_player,away_player,home_score,away_score')
          .order('arena17_id')
          .range(offset, offset + pageSize - 1)

        if (queryError) throw queryError

        const page = data ?? []
        for (const row of page) {
          const homeScore = Number(row.home_score)
          const awayScore = Number(row.away_score)
          if (
            !row.home_player ||
            !row.away_player ||
            !Number.isInteger(homeScore) ||
            !Number.isInteger(awayScore) ||
            homeScore < 0 ||
            awayScore < 0
          ) continue

          fetched.push({
            arena17_id: row.arena17_id,
            championship_id: row.championship_id,
            championship_name: championshipNameById.get(row.championship_id) ?? 'Campeonato sem nome',
            season: seasonByChampionship.get(row.championship_id) ?? null,
            home_player: canonicalRivalryPlayer(row.home_player),
            away_player: canonicalRivalryPlayer(row.away_player),
            home_score: homeScore,
            away_score: awayScore,
          })
        }

        if (page.length < pageSize) break
        offset += pageSize
      }

      if (!cancelled) {
        setMatches(fetched)
        setLoading(false)
      }
    }

    loadMatches().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { matches, loading, error }
}

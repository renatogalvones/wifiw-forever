import { useEffect, useState } from 'react'
import { PLAYER_NICKNAMES } from '../lib/calculateRanking'
import { supabase } from '../lib/supabase'
import type {
  ChampionshipRecord,
  ChampionshipTableRecord,
  RankingChampionship,
  RankingRecord,
} from '../types'
import { canonicalRivalryPlayer } from './useRivalryMatches'

export type ChampionshipPositionStats = {
  player: string
  season: string
  top3: number
  top5: number
  z4: number
}

type ChampionshipPositionStatsState = {
  finishes: ChampionshipPositionStats[]
  loading: boolean
  error: string | null
}

const playerKeys = Object.keys(PLAYER_NICKNAMES).sort((a, b) => b.length - a.length)
const seasonPattern = /(20\d{2})\/(20\d{2})/

function finalStandings(rows: string[][]): Array<{ player: string; position: number }> {
  const headerIndex = rows.findIndex((row) => row[0]?.toLocaleUpperCase().includes('CLASSIFICAÇÃO'))
  if (headerIndex < 0 || rows[headerIndex][0].toLocaleUpperCase().includes('GRUPO')) return []

  return rows.slice(headerIndex + 1).flatMap((row) => {
    const position = Number(row[0])
    const playerText = row.slice(1).filter(Boolean).join(' ')
    const player = playerKeys.find((key) => playerText.includes(key))
    return Number.isInteger(position) && position > 0 && player
      ? [{ player: canonicalRivalryPlayer(player), position }]
      : []
  })
}

export function useChampionshipPositionStats(): ChampionshipPositionStatsState {
  const [finishes, setFinishes] = useState<ChampionshipPositionStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadFinishes() {
      const [championshipsResult, linksResult, rankingsResult, tablesResult] = await Promise.all([
        supabase.from('wifiw_championships').select('arena17_id,name,status'),
        supabase.from('wifiw_ranking_championships').select('ranking_id,championship_id'),
        supabase.from('wifiw_rankings').select('arena17_id,name'),
        supabase.from('wifiw_championship_tables').select('championship_id,rows'),
      ])

      const queryError = championshipsResult.error ?? linksResult.error ?? rankingsResult.error ?? tablesResult.error
      if (queryError) throw queryError

      const championships = (championshipsResult.data ?? []) as Pick<ChampionshipRecord, 'arena17_id' | 'name' | 'status'>[]
      const links = (linksResult.data ?? []) as RankingChampionship[]
      const rankings = (rankingsResult.data ?? []) as Pick<RankingRecord, 'arena17_id' | 'name'>[]
      const tables = (tablesResult.data ?? []) as ChampionshipTableRecord[]

      const rankingSeasons = new Map(rankings.flatMap((ranking) => {
        const match = ranking.name.match(seasonPattern)
        return match ? [[ranking.arena17_id, `${match[1]}/${match[2]}`] as const] : []
      }))
      const seasonsByChampionship = new Map<number, string>()
      for (const link of links) {
        const season = rankingSeasons.get(link.ranking_id)
        if (season) seasonsByChampionship.set(link.championship_id, season)
      }
      const championshipById = new Map(championships.map((championship) => [championship.arena17_id, championship]))
      for (const championship of championships) {
        if (seasonsByChampionship.has(championship.arena17_id)) continue
        const match = championship.name.match(seasonPattern)
        if (match) seasonsByChampionship.set(championship.arena17_id, `${match[1]}/${match[2]}`)
      }

      const tablesByChampionship = new Map<number, string[][][]>()
      for (const table of tables) {
        const tableSets = tablesByChampionship.get(table.championship_id) ?? []
        tableSets.push(table.rows)
        tablesByChampionship.set(table.championship_id, tableSets)
      }

      const result: ChampionshipPositionStats[] = []
      for (const [championshipId, tableSets] of tablesByChampionship) {
        const championship = championshipById.get(championshipId)
        const season = seasonsByChampionship.get(championshipId)
        if (!championship || championship.status !== 'finalizado' || !season) continue

        const standings = tableSets.map(finalStandings).find((rows) => rows.length > 0) ?? []
        const lastPosition = Math.max(...standings.map(({ position }) => position), 0)
        for (const { player, position } of standings) {
          result.push({
            player,
            season,
            top3: position <= 3 ? 1 : 0,
            top5: position <= 5 ? 1 : 0,
            z4: position > lastPosition - 4 ? 1 : 0,
          })
        }
      }

      if (!cancelled) {
        setFinishes(result)
        setLoading(false)
      }
    }

    loadFinishes().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { finishes, loading, error }
}

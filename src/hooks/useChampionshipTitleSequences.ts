import { useEffect, useState } from 'react'
import type { ChampionshipRecord } from '../types'
import { canonicalRivalryPlayer } from './useRivalryMatches'
import { supabase } from '../lib/supabase'

export type ChampionshipTitleSequence = {
  champion: string
  length: number
  championships: Array<{ name: string; team: string | null }>
  firstId: number
  lastId: number
}

export type ChampionTeamSummary = {
  team: string
  titles: number
  players: string[]
}

type ChampionshipTitleSequencesState = {
  sequences: ChampionshipTitleSequence[]
  championTeams: ChampionTeamSummary[]
  loading: boolean
  error: string | null
}

type DatedChampionshipRecord = ChampionshipRecord & {
  championship_month: string | null
  champion_team: string | null
}

function compareChampionshipChronology(a: DatedChampionshipRecord, b: DatedChampionshipRecord) {
  if (a.championship_month && b.championship_month) {
    const monthOrder = a.championship_month.localeCompare(b.championship_month)
    if (monthOrder !== 0) return monthOrder
    const numberFromName = (name: string) => {
      const match = name.match(/^\s*(\d+)\s*\./)
      return match ? Number(match[1]) : null
    }
    const aNumber = numberFromName(a.name)
    const bNumber = numberFromName(b.name)
    if (aNumber !== null && bNumber !== null && aNumber !== bNumber) return aNumber - bNumber
  }
  return a.arena17_id - b.arena17_id
}

export function useChampionshipTitleSequences(): ChampionshipTitleSequencesState {
  const [sequences, setSequences] = useState<ChampionshipTitleSequence[]>([])
  const [championTeams, setChampionTeams] = useState<ChampionTeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSequences() {
      const { data, error: queryError } = await supabase
        .from('wifiw_championships')
        .select('arena17_id,name,status,champion_player,champion_team,championship_month')

      if (queryError) throw queryError

      const championships = (data ?? []) as DatedChampionshipRecord[]
      const completed = championships
        .filter(({ status }) => status === 'finalizado')
        .sort(compareChampionshipChronology)
      const result: ChampionshipTitleSequence[] = []
      const teamSummaries = new Map<string, { titles: number; players: Set<string> }>()
      let current: DatedChampionshipRecord[] = []

      const saveSequence = () => {
        if (current.length >= 2 && current[0].champion_player && current[current.length - 1].champion_player) {
          result.push({
            champion: canonicalRivalryPlayer(current[0].champion_player),
            length: current.length,
            championships: current.map(({ name, champion_team }) => ({ name, team: champion_team })),
            firstId: current[0].arena17_id,
            lastId: current[current.length - 1].arena17_id,
          })
        }
        current = []
      }

      for (const championship of completed) {
        const champion = championship.champion_player
          ? canonicalRivalryPlayer(championship.champion_player)
          : null

        if (champion && championship.champion_team) {
          const summary = teamSummaries.get(championship.champion_team) ?? {
            titles: 0,
            players: new Set<string>(),
          }
          summary.titles += 1
          summary.players.add(champion)
          teamSummaries.set(championship.champion_team, summary)
        }

        const previousChampion = current.length && current[current.length - 1].champion_player
          ? canonicalRivalryPlayer(current[current.length - 1].champion_player!)
          : null

        if (!champion) {
          saveSequence()
        } else if (previousChampion && champion !== previousChampion) {
          saveSequence()
          current.push(championship)
        } else {
          current.push(championship)
        }
      }
      saveSequence()

      result.sort((a, b) => b.length - a.length || b.lastId - a.lastId)
      const championTeamResults = [...teamSummaries.entries()]
        .map(([team, summary]) => ({ team, titles: summary.titles, players: [...summary.players] }))
        .sort((a, b) => b.titles - a.titles || a.team.localeCompare(b.team, 'pt-BR'))
      if (!cancelled) {
        setSequences(result)
        setChampionTeams(championTeamResults)
        setLoading(false)
      }
    }

    loadSequences().catch((loadError: unknown) => {
      if (cancelled) return
      setError(loadError instanceof Error ? loadError.message : String(loadError))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { sequences, championTeams, loading, error }
}

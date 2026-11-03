import { useEffect, useState } from 'react'
import type { ChampionshipRecord } from '../types'
import { canonicalRivalryPlayer } from './useRivalryMatches'
import { supabase } from '../lib/supabase'

export type ChampionshipTitleSequence = {
  champion: string
  length: number
  championships: string[]
  firstId: number
  lastId: number
}

type ChampionshipTitleSequencesState = {
  sequences: ChampionshipTitleSequence[]
  loading: boolean
  error: string | null
}

type DatedChampionshipRecord = ChampionshipRecord & {
  championship_month: string | null
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSequences() {
      const { data, error: queryError } = await supabase
        .from('wifiw_championships')
        .select('arena17_id,name,status,champion_player,championship_month')

      if (queryError) throw queryError

      const championships = (data ?? []) as DatedChampionshipRecord[]
      const completed = championships
        .filter(({ status }) => status === 'finalizado')
        .sort(compareChampionshipChronology)
      const result: ChampionshipTitleSequence[] = []
      let current: DatedChampionshipRecord[] = []

      const saveSequence = () => {
        if (current.length >= 2 && current[0].champion_player && current[current.length - 1].champion_player) {
          result.push({
            champion: canonicalRivalryPlayer(current[0].champion_player),
            length: current.length,
            championships: current.map(({ name }) => name),
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
      if (!cancelled) {
        setSequences(result)
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

  return { sequences, loading, error }
}

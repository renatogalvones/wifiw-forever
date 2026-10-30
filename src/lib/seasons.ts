import type { Season } from '../types'

/** "13—25" for the header note. */
export function seasonRange(seasons: Season[]): string {
  if (seasons.length === 0) return '—'
  const sorted = [...seasons].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0].season.split('/')[0]
  const last = sorted[sorted.length - 1].season.split('/')[1]
  return `${first}—${last}`
}

/** "22/23" -> "2022/23". */
export function formatSeason(season: string): string {
  const [start, end] = season.split('/')
  if (!start || !end) return season
  return `20${start}/${end}`
}

/** Accent-insensitive, case-insensitive search key. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

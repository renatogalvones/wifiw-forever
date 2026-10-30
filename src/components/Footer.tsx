import type { Season } from '../types'

type FooterProps = {
  seasons: Season[]
}

export function Footer({ seasons }: FooterProps) {
  const sorted = [...seasons].sort((a, b) => a.sort_order - b.sort_order)
  const first = sorted[0]?.season.split('/')[0]
  const last = sorted[sorted.length - 1]?.season.split('/')[1]
  const range = first && last ? `20${first} / 20${last}` : '—'

  return (
    <footer>
      <b>
        WiFIW<span style={{ color: 'var(--lime)' }}>!!</span>
      </b>
      <span>Uma liga. Muitas histórias. Um legado.</span>
      <span>{range}</span>
    </footer>
  )
}

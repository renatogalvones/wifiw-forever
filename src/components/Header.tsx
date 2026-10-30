import { seasonRange } from '../lib/seasons'
import type { Season } from '../types'

type HeaderProps = {
  seasons: Season[]
}

export function Header({ seasons }: HeaderProps) {
  return (
    <header>
      <a className="brand" href="#" aria-label="WiFIW — início">
        WiFIW<span>!!</span>
      </a>
      <div className="header-note">
        O arquivo oficial da resenha &nbsp; / &nbsp; {seasonRange(seasons)}
      </div>
    </header>
  )
}

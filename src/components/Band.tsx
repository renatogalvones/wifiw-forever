const sections = [
  { id: 'resenha', label: 'Recolhas' },
  { id: 'rivalidade', label: 'Rivalidade' },
  { id: 'estatisticas', label: 'Estatísticas' },
  { id: 'gloria', label: 'Glória' },
  { id: 'wifiw-para-sempre', label: 'WiFIW para sempre' },
] as const

export function Band() {
  return (
    <div className="band">
      {sections.map(({ id, label }, index) => (
        <div className="band-item" key={id}>
          {index > 0 && <b aria-hidden="true">✦</b>}
          <a href={`#${id}`}>{label}</a>
        </div>
      ))}
    </div>
  )
}

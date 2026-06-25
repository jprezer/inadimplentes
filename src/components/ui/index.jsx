import Icon from './Icon.jsx'

export { Icon }

/* ---------- Button ---------- */
export function Button({ variant = 'secondary', size, icon, children, className = '', ...props }) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ')
  return (
    <button className={cls} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

/* ---------- Status badge ---------- */
const STATUS = {
  ativo:      { label: 'Ativo',        variant: 'danger' },
  aberto:     { label: 'Em aberto',    variant: 'danger' },
  negociando: { label: 'Negociando',   variant: 'info' },
  quitado:    { label: 'Quitado',      variant: 'success' },
  sem:        { label: 'Sem protestos', variant: 'muted' },
}
export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.ativo
  return <span className={`badge badge-${s.variant}`}>{s.label}</span>
}

/* Badge de situação (dimensão cartório) */
const SITUACAO = {
  em_atraso:  { label: 'Em atraso',  variant: 'warn',   icon: 'clock' },
  protestado: { label: 'Protestado', variant: 'danger', icon: 'stamp' },
}
export function SituacaoBadge({ situacao }) {
  const s = SITUACAO[situacao] || SITUACAO.em_atraso
  return (
    <span className={`badge badge-icon badge-${s.variant}`}>
      <Icon name={s.icon} size={12} />{s.label}
    </span>
  )
}

/* Chips de filtro (segmented) */
export function FilterChips({ value, onChange, options }) {
  return (
    <div className="chips">
      {options.map(o => (
        <button key={o.value} className={'chip' + (value === o.value ? ' on' : '')} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* Select de status colorido — substitui badge + dropdown separados */
const STATUS_VAR = { ativo: '--danger', aberto: '--danger', negociando: '--info', quitado: '--success' }
export function StatusSelect({ value, onChange, options }) {
  const color = `var(${STATUS_VAR[value] || '--text'})`
  return (
    <select
      value={value}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className="status-select"
      style={{ color, borderColor: color, width: 148 }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ color: 'var(--text)' }}>{o.label}</option>
      ))}
    </select>
  )
}

/* ---------- Field (label + control) ---------- */
export function Field({ label, children, full }) {
  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ title, children, onClose, width }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={width ? { maxWidth: width } : undefined} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Feedback ---------- */
export function Loading({ label = 'Carregando...' }) {
  return <div className="loading"><span className="spinner" /> <span style={{ marginLeft: 8 }}>{label}</span></div>
}

export function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      {title && <div className="empty-title">{title}</div>}
      {children && <div style={{ fontSize: 13 }}>{children}</div>}
    </div>
  )
}

/* ---------- Search input ---------- */
export function SearchInput({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="search">
      <Icon name="search" />
      <input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

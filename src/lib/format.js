export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function formatData(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

export const TAXA_MENSAL_PADRAO = 0.02

export function mesesEmAtraso(dataVencimento) {
  if (!dataVencimento) return 0
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diffMs = hoje - venc
  if (diffMs <= 0) return 0
  return diffMs / (1000 * 60 * 60 * 24 * 30)
}

// Cálculo de juros simples ao mês sobre uma dívida.
// Dívidas quitadas congelam no valor original (sem juros correndo).
export function calcDivida(d) {
  const valor = Number(d.valor ?? d.valor_original ?? 0)
  if (d.status === 'quitado') return { meses: 0, juros: 0, total: valor }
  const taxa = Number(d.juros_mensal ?? TAXA_MENSAL_PADRAO)
  const meses = mesesEmAtraso(d.data_vencimento)
  const juros = valor * taxa * meses
  return { meses, juros, total: valor + juros }
}

// Total em aberto de uma lista de dívidas (ignora quitadas no "em aberto").
export function totalEmAberto(dividas = []) {
  return dividas
    .filter(d => d.status !== 'quitado')
    .reduce((acc, d) => acc + calcDivida(d).total, 0)
}

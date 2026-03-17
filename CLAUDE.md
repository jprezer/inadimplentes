# Controle de Inadimplentes — Contexto do Projeto

## O que é esse projeto

Protótipo de um sistema web para controle de clientes inadimplentes, desenvolvido para a autopeças de linha pesada da família da namorada do João. O objetivo é resolver a dor de não ter visibilidade sobre clientes com boletos protestados.

Esse protótipo **não é o produto final** — é uma ferramenta interna pra validar o domínio e ajudar a loja agora. O sistema SaaS completo vem depois.

---

## Stack

- **Frontend:** React 18 + Vite
- **Roteamento:** React Router v6
- **Banco de dados:** Supabase (PostgreSQL)
- **Deploy:** Vercel
- **Fontes:** DM Sans + DM Mono (Google Fonts)

---

## Supabase

- **URL:** `https://edbnwozrgynvkhzpfvob.supabase.co`
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYm53b3pyZ3ludmtoenBmdm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTI4NjIsImV4cCI6MjA4OTMyODg2Mn0.91R3FbbaVAucYnStASZaHI-Anq2smVj-Nyykmml842o`
- **Client:** `src/lib/supabase.js`

### Schema do banco

```sql
-- Clientes inadimplentes
clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text not null unique,
  telefone text,
  email text,
  observacoes text,
  criado_em timestamptz default now()
)

-- Protestos vinculados ao cliente
protestos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  valor numeric(10,2) not null,
  quantidade_boletos int not null default 1,
  data_protesto date not null,
  status text not null default 'ativo' check (status in ('ativo', 'negociando', 'quitado')),
  observacoes text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
)
```

O campo `atualizado_em` é atualizado automaticamente via trigger no Supabase.

---

## Estrutura de pastas

```
inadimplentes/
├── index.html
├── vite.config.js
├── vercel.json          # Rewrite rules pra SPA no Vercel
├── package.json
├── CLAUDE.md            # Este arquivo
└── src/
    ├── main.jsx         # Entry point
    ├── App.jsx          # Rotas
    ├── index.css        # Estilos globais + CSS variables
    ├── lib/
    │   └── supabase.js  # Client do Supabase
    ├── components/
    │   └── Layout.jsx   # Sidebar + wrapper de layout
    └── pages/
        ├── Dashboard.jsx       # Métricas + protestos recentes
        ├── Clientes.jsx        # Lista com busca e filtro
        ├── NovoCliente.jsx     # Formulário novo cliente + protesto
        └── ClienteDetalhe.jsx  # Detalhe, edição, gestão de protestos
```

---

## Rotas

| Rota | Página |
|------|--------|
| `/` | Dashboard |
| `/clientes` | Lista de inadimplentes |
| `/clientes/novo` | Formulário novo cliente |
| `/clientes/:id` | Detalhe do cliente |

---

## Funcionalidades implementadas

- [x] Dashboard com métricas: total em aberto, clientes, boletos, em negociação
- [x] Tabela de protestos recentes no dashboard
- [x] Lista de clientes com busca por nome/CPF e filtro por status
- [x] Cadastro de novo cliente + primeiro protesto no mesmo formulário
- [x] Detalhe do cliente com edição inline dos dados
- [x] Adição de múltiplos protestos por cliente via modal
- [x] Atualização de status do protesto diretamente na tabela (ativo / negociando / quitado)
- [x] Exclusão de cliente com confirmação
- [x] Validações básicas nos formulários
- [x] Feedback de erro em vermelho

---

## O que falta / próximos passos sugeridos

### Curto prazo (protótipo)
- [ ] **Autenticação** — adicionar login com Supabase Auth (email/senha) antes de colocar em produção
  - Sem auth, qualquer pessoa com a URL consegue ver e editar os dados
  - Supabase tem auth pronto, é ~1h de trabalho
- [ ] **RLS (Row Level Security)** — habilitar no Supabase para que só usuários autenticados acessem os dados
- [ ] **Paginação** — a lista de clientes carrega tudo de uma vez; com muitos registros vai ficar lento
- [ ] **Exportar relatório** — botão pra exportar a lista de inadimplentes em CSV ou PDF
- [ ] **Excluir protesto individual** — hoje só exclui o cliente inteiro

### Médio prazo (evolução pro SaaS)
- [ ] **Busca no momento da venda** — campo de consulta rápida por CPF/CNPJ pra verificar antes de fechar pedido
- [ ] **Histórico de negociações** — registrar acordos feitos, datas, valores negociados
- [ ] **Alertas de vencimento** — notificação quando um acordo de pagamento está perto de vencer
- [ ] **Multi-tenant** — isolar dados por empresa para atender múltiplos clientes
- [ ] **Integração com Serasa** — consulta de CPF/CNPJ na hora do cadastro

---

## Como rodar localmente

```bash
npm install
npm run dev
```

## Como fazer deploy no Vercel

1. Sobe o projeto no GitHub
2. Acessa vercel.com → New Project → importa o repositório
3. Sem nenhuma configuração extra — o `vercel.json` já trata as rotas do React
4. Deploy automático a cada push na branch main

---

## Contexto de negócio

A loja usa o **Captare Pro** como ERP principal. Esse sistema não substitui o Captare — é um complemento focado especificamente no controle de inadimplência, que o Captare não trata bem.

A visão de longo prazo é transformar isso num micro SaaS vendido para outras autopeças, distribuidoras e comércios B2B que vendem a prazo. O diferencial futuro é a **consulta no momento da venda**: antes de fechar o pedido, o vendedor verifica se o cliente tem protesto em aberto.

A loja atualmente usa o **ConsultCenter (Serasa Experian)** para consultas externas — a integração com Serasa é um passo futuro, não prioritário para o protótipo.

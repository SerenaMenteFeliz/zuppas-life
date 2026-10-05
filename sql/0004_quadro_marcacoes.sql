-- 0004: Quadro da semana, marcações e agendados (04/10/2026)
--
-- Primeira coisa da rotina da família que sai do navegador e vai pro banco.
-- O resto do app (Hoje, Semana, A casa, Akiane, TV antiga) continua no
-- localStorage até ser aposentado; o Quadro nasce aqui porque a TV da sala abre
-- o site sozinha e nunca enxergaria o que foi marcado no PC.
--
-- RLS ligada e SEM policy nas duas tabelas, igual às do Conteúdo: o acesso é
-- só server-side com a service_role.

-- ── Marcações ────────────────────────────────────────────────────────────────
-- Uma linha por "fulano fez isto neste dia". `item` é o id da rotina
-- (lib/dados.ts, ITENS) ou o id de um agendado (quadro_agenda). Texto livre de
-- propósito: a rotina vive no código, porque mudar rotina é decisão de família,
-- não toque de tela.
--
-- Única por item+dia+parte+pessoa: cada um marca o seu, ninguém sobrescreve
-- ninguém, e duas pessoas marcando ao mesmo tempo viram duas linhas em vez de
-- uma apagar a outra. `parte` fica '' hoje; existe pra um item poder ter
-- etapas no futuro sem trocar a chave.

create table if not exists quadro_marcacoes (
  id        uuid primary key default gen_random_uuid(),
  item      text not null,
  data      date not null,
  parte     text not null default '',
  pessoa    text not null,
  criado_em timestamptz not null default now(),
  unique (item, data, parte, pessoa)
);

create index if not exists quadro_marcacoes_data on quadro_marcacoes (data);

alter table quadro_marcacoes enable row level security;

-- ── Agendados ────────────────────────────────────────────────────────────────
-- O que não é rotina: dentista, reunião da escola, visita. Data, período e,
-- quando existe de verdade, horário. `para` é o nome da pessoa ou 'Casa'.

create table if not exists quadro_agenda (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  data       date not null,
  horario    text,
  bloco      text not null check (bloco in ('manha', 'tarde', 'noite')),
  para       text not null default 'Casa',
  criado_por text,
  criado_em  timestamptz not null default now()
);

create index if not exists quadro_agenda_data on quadro_agenda (data);

alter table quadro_agenda enable row level security;

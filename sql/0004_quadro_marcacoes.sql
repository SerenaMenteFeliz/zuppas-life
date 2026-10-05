-- 0004: marcações do Quadro da semana (04/10/2026)
--
-- Primeira coisa da rotina da família que sai do navegador e vai pro banco.
-- O resto do app (Hoje, Semana, A casa, Akiane, TV antiga) continua no
-- localStorage até ser aposentado; o Quadro nasce aqui porque a TV da sala abre
-- o site sozinha e nunca enxergaria o que foi marcado no PC.
--
-- Uma linha por marcação: o quê, que dia, qual parte (o passeio da manhã do
-- Biro, o "levar" da escola) e quem. Única por item+dia+parte+pessoa: cada um
-- marca o seu, ninguém sobrescreve ninguém, e duas pessoas marcando ao mesmo
-- tempo viram duas linhas em vez de uma apagar a outra.
--
-- `item` é texto livre de propósito: as linhas da grade vivem no código
-- (lib/quadro-itens.ts). Mudar rotina é decisão de família, não toque de tela.
-- `parte` é '' quando a linha não tem partes, pra caber na chave única.
--
-- RLS ligada e SEM policy, igual às tabelas do Conteúdo: o acesso é só
-- server-side com a service_role.

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

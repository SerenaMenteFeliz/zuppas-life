-- Painel de Conteúdo (11/08/2026) — primeira escrita do zuppas-life no banco.
--
-- Roda no SQL Editor do Supabase do SMF (ddgtoebsmmyneumolycy). Até aqui o
-- zuppas-life só LIA esse banco (contacts, lead_events, nutricao_*, tudo do
-- serena-app/metodocalice-site). Estas três tabelas são as primeiras que ele
-- possui de fato.
--
-- Por que no mesmo banco, e não num projeto próprio (decidido com o Yan em
-- 11/08): MVP primeiro, isolamento depois. Um segundo projeto Supabase custa
-- duas cotas, dois pares de chave e mais uma coisa pra manter viva, em troca
-- de uma separação que hoje não é usada — a mesma service_role já vive no
-- .env deste app. A separação continua sendo o destino: por isso o prefixo
-- `conteudo_` em tudo e TODO acesso concentrado em lib/conteudo.ts, pra que
-- mudar de banco depois seja uma env var e um arquivo, não uma caçada.
--
-- RLS: ligada e SEM policy nenhuma, de propósito. O acesso é 100% server-side
-- com a service_role (que passa por cima da RLS); qualquer chave anon que
-- vaze não lê nada. No dia em que a Ge tiver login de verdade, a policy nasce
-- aqui e o padrão já é o restritivo, não o aberto.

create table if not exists conteudo_posts (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  perfil         text not null,
  formato        text,
  pilar          text,
  produto        text,
  status         text not null default 'ideia',
  data_planejada date,
  data_publicada date,
  link           text,
  legenda        text,
  hashtags       text,
  responsavel    text,
  referencia     text,
  observacao     text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create index if not exists conteudo_posts_planejada_idx on conteudo_posts (data_planejada);
create index if not exists conteudo_posts_status_idx    on conteudo_posts (status);
create index if not exists conteudo_posts_perfil_idx    on conteudo_posts (perfil);

-- O roteiro é lista de falas, não um campo de texto. Motivo (Yan, 11/08): a
-- gravação é sempre frase por frase, então a unidade real de trabalho é a
-- frase, e é nela que o planejamento de cena precisa morar. Roteiro como
-- textarea deixaria a cena sem lugar e o dia de gravação continuaria sendo
-- alguém lendo um documento em vez de seguindo uma lista.
create table if not exists conteudo_falas (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references conteudo_posts(id) on delete cascade,
  ordem          integer not null,
  texto          text not null default '',
  funcao         text,
  enquadramento  text,
  cenario        text,
  acao           text,
  broll          text,
  texto_tela     text,
  observacao     text,
  gravada        boolean not null default false,
  criado_em      timestamptz not null default now()
);

create index if not exists conteudo_falas_post_idx on conteudo_falas (post_id, ordem);

-- Métrica é série, não número. Um reel continua rendendo por semanas: um campo
-- `views` único seria sobrescrito a cada coleta e a curva (tem cauda? morreu em
-- 48h?) se perderia, que é justamente o que decide se o formato se repete.
create table if not exists conteudo_metricas (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references conteudo_posts(id) on delete cascade,
  coletado_em       date not null,
  views             integer,
  alcance           integer,
  salvos            integer,
  compartilhamentos integer,
  comentarios       integer,
  seguidores        integer,
  cliques           integer,
  criado_em         timestamptz not null default now(),
  unique (post_id, coletado_em)
);

create index if not exists conteudo_metricas_post_idx on conteudo_metricas (post_id, coletado_em desc);

alter table conteudo_posts    enable row level security;
alter table conteudo_falas    enable row level security;
alter table conteudo_metricas enable row level security;

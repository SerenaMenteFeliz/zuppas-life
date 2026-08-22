-- Inteligência de conteúdo (22/08/2026), segunda migration do zuppas-life.
--
-- Roda no SQL Editor do Supabase do SMF (ddgtoebsmmyneumolycy), mesmo projeto
-- da 0001. Toda ela é aditiva: nenhuma coluna existente muda de tipo, nenhuma
-- linha é reescrita, e rodar duas vezes não quebra nada (`if not exists` em
-- tudo). Isso é de propósito: quem roda isso é o Yan à mão, no meio de outra
-- coisa, e migration que exige atenção é migration que um dia roda errado.
--
-- RLS: ligada e SEM policy, igual à 0001. O acesso é 100% server-side com a
-- service_role; chave anon que vaze não lê nada.

-- ---------------------------------------------------------------------------
-- 1. Local de gravação no post
-- ---------------------------------------------------------------------------
--
-- Local é propriedade do POST, não da fala: escolhe uma vez e todas as falas
-- herdam. Fala 3 na praia e fala 4 em casa existe, mas é exceção, e o custo de
-- modelar a exceção é encher a tela de roteiro com um campo que quase nunca
-- muda entre falas.
--
-- Por que isso é dado e não só texto livre: cena impossível é a razão mais
-- provável de um roteiro travar em `roteiro` e nunca virar `gravado`. Com o
-- local no post, o quadro consegue responder "por que quatro roteiros estão
-- parados?" com "todos pedem praia".
--
-- O vocabulário de locais NÃO vive aqui, vive em lib/ia/inteligencia.ts, que é
-- alimentado pelo vault. Mesma razão de PILARES e FORMATOS não serem enum no
-- banco: valor que a gente ainda vai mexer não deve virar constraint antes de
-- estar estável, senão toda troca de vocabulário vira migration.
alter table conteudo_posts add column if not exists local text;

create index if not exists conteudo_posts_local_idx on conteudo_posts (local);

-- ---------------------------------------------------------------------------
-- 2. Registros, o log central da plataforma
-- ---------------------------------------------------------------------------
--
-- Escopo é a PLATAFORMA inteira, não só a IA (Yan, 22/08/2026). A IA é o
-- primeiro cliente porque é a primeira coisa que falha de um jeito que ninguém
-- vê.
--
-- O motivo de existir junto com a IA, e não depois: a cascata de modelo e a
-- rotação de chave ESCONDEM falha por construção. Se uma conta cair, o sistema
-- usa a próxima e continua funcionando, até a última cair, provavelmente com
-- a Ge na frente da tela. É a mesma classe do defeito de 04/08, em que o fetch
-- que gravava lead era fire-and-forget e o 500 não aparecia pra ninguém: 23
-- leads reais perdidos, três dias sem ninguém saber.
--
-- `detalhe` é jsonb e não colunas por causa disso ser log de várias áreas: o
-- que a IA quer guardar (modelo, chave, tokens) não é o que uma automação vai
-- querer. Coluna por campo aqui viraria uma tabela com 30 colunas nulas.
create table if not exists painel_registros (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  -- 'ia', 'conteudo', 'funis'... o filtro grosso da tela de Registros
  area        text not null,
  -- 'importar-roteiro', 'gerar-roteiro', 'chave-morta'...
  acao        text not null,
  -- 'info' | 'aviso' | 'erro'. Sem CHECK de propósito: vocabulário ainda
  -- mexendo, e uma constraint aqui transformaria "quero registrar um nível
  -- novo" numa migration.
  nivel       text not null default 'info',
  mensagem    text not null,
  detalhe     jsonb,
  -- A que coisa isso se refere, quando se refere a alguma. Sem FK: registro
  -- tem que sobreviver ao post que ele descreve, senão apagar um post apaga a
  -- prova de que a IA errou nele.
  ref_tipo    text,
  ref_id      text,
  duracao_ms  integer
);

create index if not exists painel_registros_criado_idx on painel_registros (criado_em desc);
create index if not exists painel_registros_area_idx   on painel_registros (area, criado_em desc);
create index if not exists painel_registros_nivel_idx  on painel_registros (nivel, criado_em desc);

-- ---------------------------------------------------------------------------
-- 3. Baldes de cota esgotados
-- ---------------------------------------------------------------------------
--
-- Um "balde" é o par (chave, modelo). No free tier do Gemini a cota é POR
-- MODELO, não por chave: cada modelo Flash tem 20 requisições/dia e cada Flash
-- Lite tem 500, na mesma chave. Por isso a cascata de modelo rende mais que a
-- rotação de conta, e as duas juntas rendem mais ainda.
--
-- Esta tabela NÃO é um contador, e isso é decisão explícita (Yan, 22/08/2026).
-- Contador local desincroniza do contador do Google: requisição que falhou
-- pode ter contado lá e não aqui, chamada da mesma chave feita de outro lugar
-- não passa por este código, e o reset é no fuso deles. Contador dessincronizado
-- é pior que contador nenhum, porque mente com confiança: ou bloqueia chamada
-- que ia funcionar, ou libera a que vai tomar 429.
--
-- O que isto guarda é MARCAÇÃO REATIVA: quando o Google devolve 429, o balde é
-- marcado como esgotado até o próximo reset e para de ser tentado. Em regime
-- normal é uma tentativa por chamada; só na virada custa uma tentativa extra.
--
-- `chave` é o RÓTULO da chave ("chave-1"), nunca a chave em si. Log com
-- credencial dentro é credencial vazada com passo extra.
create table if not exists painel_ia_baldes (
  chave        text not null,
  modelo       text not null,
  esgotado_ate timestamptz not null,
  motivo       text,
  criado_em    timestamptz not null default now(),
  primary key (chave, modelo)
);

create index if not exists painel_ia_baldes_ate_idx on painel_ia_baldes (esgotado_ate);

-- ---------------------------------------------------------------------------
-- 4. Catálogo de cenas
-- ---------------------------------------------------------------------------
--
-- Cresce do USO, não do cadastro: cena que apareceu num post que chegou a
-- `gravado` foi testada contra a realidade da casa, e é essa a única prova que
-- importa de que ela é gravável.
--
-- Catálogo fixo cadastrado à mão dá viabilidade total e repetição; modelo
-- inventando cena toda vez dá variedade com viabilidade baixa. O desenho é
-- híbrido: o catálogo entra no prompt como vocabulário e exemplo, e o modelo
-- escolhe de lá por padrão.
--
-- Vazio não trava nada: sem catálogo o modelo trabalha só com a ficha do
-- local. É o estado normal no primeiro dia.
create table if not exists conteudo_cenas (
  id             uuid primary key default gen_random_uuid(),
  local          text not null,
  descricao      text not null,
  enquadramento  text,
  -- De qual post ela saiu. `set null` e não `cascade`: apagar o post não pode
  -- apagar a cena, que já provou que funciona e vale pros próximos.
  origem_post_id uuid references conteudo_posts(id) on delete set null,
  usos           integer not null default 1,
  criado_em      timestamptz not null default now(),
  unique (local, descricao)
);

create index if not exists conteudo_cenas_local_idx on conteudo_cenas (local, usos desc);

-- ---------------------------------------------------------------------------

alter table painel_registros  enable row level security;
alter table painel_ia_baldes  enable row level security;
alter table conteudo_cenas    enable row level security;

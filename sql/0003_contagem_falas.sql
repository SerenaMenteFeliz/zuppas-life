-- 0003 — contagem de falas por post, feita no banco
--
-- Por que existe (30/08/2026): o painel de Conteúdo mostra "12/12 falas" no
-- rodapé de cada card, e pra isso baixava a tabela `conteudo_falas` INTEIRA a
-- cada carregamento (`select=post_id,gravada`, sem filtro). Medido em produção
-- naquele dia: 600 linhas, 41,6 KB, em toda troca de aba, todo filtro de perfil
-- e toda mudança de status (o `revalidatePath` refaz as duas consultas).
--
-- O custo crescia com o TAMANHO DOS ROTEIROS, não com o número de posts: cada
-- fala nova de cada roteiro engorda todo carregamento da tela, pra desenhar um
-- rótulo de sete caracteres. Na cadência de agosto (16 posts/mês, ~13 falas
-- por post), dezembro chegaria perto de 1.400 linhas por carregamento.
--
-- A saída natural seria agregar na própria consulta (`select=post_id,id.count()`),
-- mas este projeto Supabase responde `PGRST123: Use of aggregate functions is
-- not allowed` — agregação está desligada. Daí a visão: ela agrega do lado do
-- banco e devolve UMA linha por post (46 linhas, ~2 KB).
--
-- Compatibilidade: `lib/conteudo.ts` sonda esta visão e, se ela não existir,
-- volta sozinho pro caminho antigo. Ou seja, deployar antes de rodar este
-- arquivo não quebra nada, só continua caro. O mesmo padrão da coluna `local`
-- na migration 0002, e pelo mesmo motivo: a migration é rodada à mão.

create or replace view conteudo_falas_contagem as
select
  post_id,
  count(*)::int as total,
  count(*) filter (where gravada)::int as gravadas
from conteudo_falas
group by post_id;

-- O painel fala com o PostgREST usando a service role. O grant é explícito
-- porque privilégio padrão de visão nova depende de como o schema foi criado,
-- e uma visão sem grant devolve 401 em vez de erro de coluna — que é o mesmo
-- sintoma de chave errada e custa tempo pra diagnosticar.
grant select on conteudo_falas_contagem to service_role;

-- `conteudo_falas` já tem índice por `post_id`? Se não tiver, o agrupamento
-- varre a tabela toda. Em 600 linhas isso é irrelevante, e continua sendo em
-- 10 mil; a linha abaixo existe pra não virar problema silencioso depois.
create index if not exists conteudo_falas_post_id_idx on conteudo_falas (post_id);

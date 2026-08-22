import BotaoCriar from "@/components/painel/BotaoCriar";
import ConteudoQuadro from "@/components/painel/ConteudoQuadro";
import ConteudoCalendario from "@/components/painel/ConteudoCalendario";
import ConteudoLista, { type Ordem } from "@/components/painel/ConteudoLista";
import FiltroPerfil from "@/components/painel/FiltroPerfil";
import LinkVisao from "@/components/painel/LinkVisao";
import PainelTopo from "@/components/painel/PainelTopo";
import { contarFalas, listarPosts } from "@/lib/conteudo";
import { mesValido, semanaValida } from "@/lib/conteudo-calendario";
import {
  PERFIS,
  STATUS_INFO,
  dataDoPost,
  perfilPorId,
  type Post,
  type Status,
} from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";
import { criarPostAcao } from "./acoes";

/* Painel de Conteúdo (11/08/2026), a metade esquerda do funil.

   O /painel/funis só enxerga a partir de "visitou o quiz": tudo que acontece
   antes (que post levou a pessoa até a bio) era cego. Esta seção é onde o
   conteúdo que gera esse tráfego passa a ter registro.

   Três visões sobre a MESMA lista, porque são três perguntas diferentes:
   quadro = "onde travou", calendário = "o que sai quando", lista = "compara".
   A visão vive na URL e não em estado de cliente, pra ser compartilhável e
   pro botão voltar funcionar. */

export const dynamic = "force-dynamic";

type Busca = {
  v?: string;
  perfil?: string;
  mes?: string;
  semana?: string;
  janela?: string;
  ord?: string;
};

const VISOES = [
  { id: "quadro", rotulo: "Quadro" },
  { id: "calendario", rotulo: "Calendário" },
  { id: "lista", rotulo: "Lista" },
];

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const busca = await searchParams;
  const visao = VISOES.some((v) => v.id === busca.v) ? busca.v! : "quadro";
  const perfilFiltro = PERFIS.some((p) => p.id === busca.perfil) ? busca.perfil : undefined;

  const ordem = ordemValida(busca.ord);

  const [todos, contagens] = await Promise.all([listarPosts(), contarFalas()]);
  const filtrados = perfilFiltro ? todos.filter((p) => p.perfil === perfilFiltro) : todos;
  /* Ordenar só faz sentido na Lista, que é a visão de comparar. O quadro ordena
     por status e o calendário por data, por definição — reordenar ali seria
     ignorado e a URL mentiria sobre o que está vendo. */
  const posts = visao === "lista" ? ordenar(filtrados, contagens, ordem) : filtrados;

  /* Quem vai ser o dono do post novo. Sem filtro de perfil o padrão é a Ge,
     e o botão passa a DIZER isso em vez de decidir em silêncio. */
  const perfilDoNovo = perfilFiltro ?? "geovana";
  const donoDoNovo = perfilPorId(perfilDoNovo)?.dono ?? perfilDoNovo;

  const hoje = hojeISO();
  const mes = mesValido(busca.mes, hoje);
  const semana = semanaValida(busca.semana, hoje);
  /* Mês é o padrão: quem abre o calendário quase sempre quer a visão larga
     primeiro, e a semana é o zoom que se pede. */
  const janela = busca.janela === "semana" ? "semana" : "mes";

  const link = (mudanca: Partial<Busca>) => {
    const atual: Busca = {
      v: visao,
      perfil: perfilFiltro,
      mes: busca.mes,
      semana: busca.semana,
      janela: busca.janela,
      ord: busca.ord,
      ...mudanca,
    };
    const qs = new URLSearchParams();
    if (atual.v) qs.set("v", atual.v);
    if (atual.perfil) qs.set("perfil", atual.perfil);
    if (atual.mes) qs.set("mes", atual.mes);
    if (atual.semana) qs.set("semana", atual.semana);
    if (atual.janela) qs.set("janela", atual.janela);
    if (atual.ord) qs.set("ord", atual.ord);
    return "/painel/conteudo?" + qs.toString();
  };

  /* Um href por coluna, montado aqui. Ver o comentário no ConteudoLista sobre
     por que não vai a função.

     E montado DEPOIS de `link`, não antes: `const` não sobe como `function`,
     então chamar `link()` acima da declaração dele derruba a rota inteira com
     "Cannot access 'link' before initialization". Foi o que aconteceu na
     primeira versão disto, em 22/08/2026. */
  const linksDeOrdem = Object.fromEntries(
    ORDENS.map((o) => [o, link({ ord: o })]),
  ) as Record<Ordem, string>;

  return (
    <>
      {/* Rótulo, controles e ação numa faixa fixa só (22/08/2026). Antes eram
          duas linhas roláveis: um letreiro de 3rem repetindo o que a sidebar já
          diz, e embaixo os controles, que sumiam justamente quando a lista
          ficava longa o bastante pra alguém querer trocar de visão.

          A visão continua em botões colados e não em dropdown (decidido com o
          Yan em 21/08): são três opções e são a navegação principal da tela,
          então valem os três à vista e a troca em um clique. O dropdown ficou
          pro perfil, que tem mais opções e é filtro secundário. */}
      <PainelTopo
        titulo="Conteúdo"
        controles={
          <>
            <nav className="conteudo-visoes">
              {VISOES.map((v) => (
                <LinkVisao
                  key={v.id}
                  href={link({ v: v.id })}
                  ativo={v.id === visao}
                  className={"conteudo-visao" + (v.id === visao ? " conteudo-visao-ativa" : "")}
                >
                  {v.rotulo}
                </LinkVisao>
              ))}
            </nav>

            <FiltroPerfil
              valor={perfilFiltro}
              opcoes={[
                { id: "", rotulo: "Todos os perfis", href: link({ perfil: undefined }) },
                ...PERFIS.map((p) => ({
                  id: p.id,
                  rotulo: p.rotulo,
                  href: link({ perfil: p.id }),
                  cor: p.cor,
                })),
              ]}
            />
          </>
        }
        acoes={
          /* Um clique e nada mais. O post nasce sem título e a tela seguinte
             abre com o campo focado. */
          <form action={criarPostAcao}>
            <input type="hidden" name="perfil" value={perfilDoNovo} />
            <BotaoCriar dono={donoDoNovo} />
          </form>
        }
      />

      <div className="painel-conteudo">
        {/* O quadro continua aparecendo com zero post (22/08/2026). Antes, uma
            base vazia trocava tudo por uma frase, e quem abria pela primeira
            vez não descobria que existe uma esteira — Ideia, Roteiro, Gravado,
            Agendado, Postado. As colunas vazias ensinam o fluxo de graça; a
            frase sozinha não ensinava nada. */}
        {todos.length === 0 && (
          <p className="conteudo-primeiro-passo">
            Nada aqui ainda. Cada post começa como <strong>Ideia</strong> e anda pelas colunas
            até virar <strong>Postado</strong>. Aperte <strong>Criar</strong> ali em cima: o post
            nasce vazio e você escreve o nome na tela seguinte.
          </p>
        )}

        {visao === "quadro" ? (
          <ConteudoQuadro posts={posts} contagens={Object.fromEntries(contagens)} />
        ) : visao === "calendario" ? (
          <ConteudoCalendario
            mes={mes}
            semana={semana}
            janela={janela}
            posts={posts}
            hoje={hoje}
            perfilFiltro={perfilFiltro}
          />
        ) : (
          <ConteudoLista
            posts={posts}
            contagens={Object.fromEntries(contagens)}
            ordem={ordem}
            links={linksDeOrdem}
          />
        )}
      </div>
    </>
  );
}

const ORDENS: Ordem[] = ["titulo", "perfil", "formato", "pilar", "status", "data", "roteiro"];

function ordemValida(bruto: string | undefined): Ordem {
  return ORDENS.includes(bruto as Ordem) ? (bruto as Ordem) : "data";
}

/* Ordenação da Lista.

   Campo vazio vai SEMPRE pro fim, em qualquer coluna. Sem isso, ordenar por
   "pilar" encabeçaria a lista com tudo que ninguém classificou, que é o oposto
   de comparar: o que interessa numa comparação é o que está preenchido.

   `localeCompare` com locale pt-BR porque "Ação" e "Agendado" precisam sair na
   ordem que uma pessoa espera, e a comparação binária de string põe qualquer
   acento depois do Z. */
function ordenar(
  posts: Post[],
  contagens: Map<string, { total: number; gravadas: number }>,
  ordem: Ordem,
): Post[] {
  const texto = (p: Post): string => {
    if (ordem === "titulo") return p.titulo?.trim() ?? "";
    if (ordem === "perfil") return perfilPorId(p.perfil)?.dono ?? p.perfil;
    if (ordem === "formato") return p.formato ?? "";
    if (ordem === "pilar") return p.pilar ?? "";
    if (ordem === "status") return STATUS_INFO[p.status as Status]?.rotulo ?? p.status;
    if (ordem === "data") return dataDoPost(p) ?? "";
    return "";
  };

  return [...posts].sort((a, b) => {
    if (ordem === "roteiro") {
      /* Roteiro ordena por QUANTO FALTA gravar, não pelo total: a pergunta que
         a coluna responde é "o que está mais perto de sair". Post sem roteiro
         nenhum não tem resposta e vai pro fim. */
      const ca = contagens.get(a.id);
      const cb = contagens.get(b.id);
      if (!ca && !cb) return 0;
      if (!ca) return 1;
      if (!cb) return -1;
      return cb.gravadas / cb.total - ca.gravadas / ca.total;
    }

    const ta = texto(a);
    const tb = texto(b);
    if (ta === "" && tb === "") return 0;
    if (ta === "") return 1;
    if (tb === "") return -1;
    /* Data desce (mais recente primeiro); o resto sobe (A→Z). */
    return ordem === "data" ? tb.localeCompare(ta) : ta.localeCompare(tb, "pt-BR");
  });
}

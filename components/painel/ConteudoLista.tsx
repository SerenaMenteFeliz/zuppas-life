"use client";

import { useRouter } from "next/navigation";
import Dropdown from "@/components/painel/Dropdown";
import { Filtro } from "@/components/icones";
import {
  STATUS_INFO,
  dataDoPost,
  perfilPorId,
  tituloDe,
  type PostResumo,
  type Status,
} from "@/lib/conteudo-tipos";

/* A visão de Lista, que é a de COMPARAR.

   Duas coisas que faltavam pra ela cumprir esse papel (22/08/2026):

   1. **Ordenar.** Sem ordenação, "comparar" era ler linha por linha na ordem
      em que o banco devolveu. Agora cada cabeçalho é um link que troca a
      ordem, e a ordem vive na URL (`?ord=`) como o resto do estado desta tela:
      compartilhar o link leva a mesma lista, e o botão voltar funciona.

   2. **Linha inteira clicável.** Só o título abria o post, ou seja, um alvo de
      duas palavras no meio de uma linha de 1400px de largura. O `<tr>` inteiro
      abre; o título continua sendo um link de verdade, pra que clique do meio,
      "abrir em nova aba" e navegação por teclado continuem funcionando (é o que
      um `onClick` sozinho quebraria).

   Ordenar é em memória e não no banco de propósito: a lista inteira já vem pra
   montar quadro e calendário na mesma consulta, e uma segunda ida ao banco pra
   reordenar 30 linhas custaria mais que a ordenação. */

export type Ordem =
  | "titulo"
  | "perfil"
  | "formato"
  | "pilar"
  | "status"
  | "data"
  | "roteiro";

type Contagem = { total: number; gravadas: number };

export type Direcao = "asc" | "desc";

/** Filtro de uma coluna: o valor ligado agora e as opções, cada uma já com a
    URL pronta. Href e não função pelo mesmo motivo da ordenação (ver abaixo). */
export type FiltroColuna = {
  ativo?: string;
  opcoes: { valor: string; rotulo: string; href: string; cor?: string }[];
};

const COLUNAS: { id: Ordem; rotulo: string }[] = [
  { id: "titulo", rotulo: "Título" },
  { id: "perfil", rotulo: "Perfil" },
  { id: "formato", rotulo: "Formato" },
  { id: "pilar", rotulo: "Pilar" },
  { id: "status", rotulo: "Status" },
  { id: "data", rotulo: "Data" },
  { id: "roteiro", rotulo: "Roteiro" },
];

/* Os links chegam prontos, num objeto, em vez de este componente receber a
   função que monta a URL. Função não atravessa a fronteira servidor/cliente, e
   passar uma derruba a rota inteira com 500 — foi o que aconteceu no primeiro
   deploy do FiltroPerfil, em 21/08/2026. A regra de montar URL continua morando
   só na página; o que cruza é texto. */
/** O recorte que está na tela, pra desenhar o rodapé de páginas.

    Os hrefs chegam prontos porque quem sabe montar URL desta tela é a página
    (ver o comentário acima sobre função não atravessar a fronteira). */
export type Paginacao = {
  pagina: number;
  paginas: number;
  primeiro: number;
  ultimo: number;
  total: number;
  anterior?: string;
  proxima?: string;
};

export default function ConteudoLista({
  posts,
  contagens,
  ordem,
  direcao,
  filtros,
  links,
  paginacao,
  termo,
  sufixo,
}: {
  posts: PostResumo[];
  contagens: Record<string, Contagem>;
  /** Coluna ordenada agora, ou `null` no estado padrão. */
  ordem: Ordem | null;
  direcao: Direcao;
  filtros: Partial<Record<Ordem, FiltroColuna>>;
  /** Href do PRÓXIMO estado de cada coluna no ciclo de ordenação. */
  links: Record<Ordem, string>;
  paginacao?: Paginacao;
  /** O que foi buscado, só pra explicar a lista vazia. */
  termo?: string;
  /** Query do recorte atual, pendurada no link do post pro voltar preservar. */
  sufixo: string;
}) {
  const router = useRouter();

  if (posts.length === 0) {
    return (
      <div className="glass-card conteudo-lista-vazia">
        {termo
          ? "Nenhum post com “" + termo + "” no título."
          : "Nenhum post nesta lista ainda."}
      </div>
    );
  }

  return (
    <>
    {/* A caixa rola nos dois eixos e para na altura da janela (30/08/2026):
        antes a tabela esticava a página e o cabeçalho de ordenação sumia
        justamente quando a lista ficava longa o bastante pra alguém querer
        reordenar. Agora ele fica grudado no topo da caixa. */}
    <div className="glass-card conteudo-lista-caixa">
      <table className="painel-tabela conteudo-lista-tabela">
        <thead>
          <tr>
            {COLUNAS.map((c) => {
              const ativa = ordem === c.id;
              const filtro = filtros[c.id];
              return (
                <th
                  key={c.id}
                  aria-sort={!ativa ? "none" : direcao === "asc" ? "ascending" : "descending"}
                >
                  <div className="conteudo-th">
                    {/* Clicar no rótulo anda o ciclo da coluna. O `title` diz o
                        que o próximo clique faz, porque uma seta sozinha não
                        anuncia que existe um terceiro estado. */}
                    <a
                      href={links[c.id]}
                      className={"conteudo-ordenar" + (ativa ? " conteudo-ordenar-ativa" : "")}
                      title={
                        !ativa
                          ? "Ordenar por " + c.rotulo
                          : direcao === "asc"
                            ? "Inverter a ordem"
                            : "Voltar à ordem padrão"
                      }
                    >
                      {c.rotulo}
                      {ativa && <span aria-hidden> {direcao === "asc" ? "↑" : "↓"}</span>}
                    </a>

                    {/* O filtro fica ao lado, e não dentro do mesmo alvo do
                        rótulo: são dois gestos diferentes no mesmo cabeçalho, e
                        juntá-los faria um clique fazer as duas coisas. O funil
                        acende quando há filtro ligado, pra dar pra ver de
                        relance qual coluna está recortando a lista. */}
                    {filtro && (
                      <FiltroDeColuna coluna={c.rotulo} filtro={filtro} />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const perfil = perfilPorId(p.perfil);
            const c = contagens[p.id];
            const data = dataDoPost(p);
            const href = "/painel/conteudo/" + p.id + sufixo;
            return (
              <tr
                key={p.id}
                className="conteudo-linha"
                onClick={() => router.push(href)}
                /* O `<tr>` não é focável por natureza e o teclado já alcança o
                   post pelo link do título, então a linha não entra na ordem de
                   tabulação: seria um segundo caminho pro mesmo lugar. */
              >
                <td>
                  <a href={href} className="conteudo-linha-titulo">
                    {tituloDe(p)}
                  </a>
                </td>
                <td>
                  <span
                    className="conteudo-ponto"
                    style={{ background: perfil?.cor ?? "var(--ink-soft)" }}
                  />
                  {perfil?.dono ?? p.perfil}
                </td>
                <td>{p.formato ?? "·"}</td>
                <td>{p.pilar ?? "·"}</td>
                <td>{STATUS_INFO[p.status as Status]?.rotulo ?? p.status}</td>
                <td>{data ? data.split("-").reverse().join("/") : "·"}</td>
                <td>{c ? c.gravadas + "/" + c.total : "·"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Rodapé de páginas (30/08/2026). Aparece só quando há mais de uma: numa
        lista de meia página, um paginador é ruído dizendo "1 de 1".

        Diz o intervalo e o total, não só o número da página. "26 a 50 de 137"
        responde sozinho onde a pessoa está; "página 2" exige que ela saiba
        quantos cabem por página pra significar alguma coisa. */}
    {paginacao && paginacao.paginas > 1 && (
      <nav className="conteudo-paginacao" aria-label="Páginas da lista">
        {paginacao.anterior ? (
          <a href={paginacao.anterior} className="chip">
            ‹ Anterior
          </a>
        ) : (
          <span className="chip conteudo-pagina-morta">‹ Anterior</span>
        )}

        {/* Duas informações, e cada uma responde uma pergunta diferente: em que
            página estou (e quantas existem) e o que estou vendo agora. Só o
            intervalo obrigava a pessoa a dividir de cabeça pra saber se faltava
            muito. */}
        <span className="conteudo-paginacao-conta">
          Página {paginacao.pagina} de {paginacao.paginas}{" "}
          <span className="conteudo-paginacao-detalhe">
            ({paginacao.ultimo - paginacao.primeiro + 1} de {paginacao.total})
          </span>
        </span>

        {paginacao.proxima ? (
          <a href={paginacao.proxima} className="chip">
            Próxima ›
          </a>
        ) : (
          <span className="chip conteudo-pagina-morta">Próxima ›</span>
        )}
      </nav>
    )}
    </>
  );
}

/* O funil de uma coluna. Reaproveita o `Dropdown` do painel (teclado, portal e
   fechamento já resolvidos lá) e navega no lugar de guardar estado: o recorte
   vive na URL como todo o resto desta tela. */
function FiltroDeColuna({ coluna, filtro }: { coluna: string; filtro: FiltroColuna }) {
  const router = useRouter();
  const porValor = new Map(filtro.opcoes.map((o) => [o.valor, o.href]));
  const ligado = filtro.ativo !== undefined && filtro.ativo !== "";

  return (
    <span
      className={"conteudo-th-filtro" + (ligado ? " conteudo-th-filtro-ligado" : "")}
      /* A linha do cabeçalho inteira não navega, mas o `<a>` do rótulo está ao
         lado: sem parar o clique aqui, abrir o filtro poderia disparar a
         ordenação por acidente de propagação. */
      onClick={(e) => e.stopPropagation()}
    >
      <Dropdown
        compacto
        icone={<Filtro className="h-3 w-3" />}
        largura={220}
        rotuloAcessivel={"Filtrar por " + coluna}
        valor={filtro.ativo ?? ""}
        opcoes={filtro.opcoes.map((o) => ({ valor: o.valor, rotulo: o.rotulo, cor: o.cor }))}
        aoEscolher={(v) => {
          const href = porValor.get(v);
          if (href) router.push(href);
        }}
      />
    </span>
  );
}

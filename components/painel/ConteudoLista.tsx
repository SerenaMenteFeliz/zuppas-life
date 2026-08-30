"use client";

import { useRouter } from "next/navigation";
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
  links,
  paginacao,
  termo,
}: {
  posts: PostResumo[];
  contagens: Record<string, Contagem>;
  ordem: Ordem;
  links: Record<Ordem, string>;
  paginacao?: Paginacao;
  /** O que foi buscado, só pra explicar a lista vazia. */
  termo?: string;
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
    <div className="glass-card overflow-x-auto p-1">
      <table className="painel-tabela">
        <thead>
          <tr>
            {COLUNAS.map((c) => (
              <th key={c.id} aria-sort={ordem === c.id ? "ascending" : "none"}>
                <a
                  href={links[c.id]}
                  className={"conteudo-ordenar" + (ordem === c.id ? " conteudo-ordenar-ativa" : "")}
                >
                  {c.rotulo}
                  {ordem === c.id && <span aria-hidden> ↑</span>}
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const perfil = perfilPorId(p.perfil);
            const c = contagens[p.id];
            const data = dataDoPost(p);
            const href = "/painel/conteudo/" + p.id;
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

        <span className="conteudo-paginacao-conta">
          {paginacao.primeiro} a {paginacao.ultimo} de {paginacao.total}
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

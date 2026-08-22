"use client";

import { useRouter } from "next/navigation";
import {
  STATUS_INFO,
  dataDoPost,
  perfilPorId,
  tituloDe,
  type Post,
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
export default function ConteudoLista({
  posts,
  contagens,
  ordem,
  links,
}: {
  posts: Post[];
  contagens: Record<string, Contagem>;
  ordem: Ordem;
  links: Record<Ordem, string>;
}) {
  const router = useRouter();

  if (posts.length === 0) {
    return (
      <div className="glass-card conteudo-lista-vazia">
        Nenhum post nesta lista ainda.
      </div>
    );
  }

  return (
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
  );
}

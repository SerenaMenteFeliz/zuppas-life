"use client";

import Link from "next/link";
import { useTransition } from "react";
import { mudarStatusAcao } from "@/app/painel/conteudo/acoes";
import Dropdown from "@/components/painel/Dropdown";
import {
  STATUS_INFO,
  STATUS_QUADRO,
  dataDoPost,
  perfilPorId,
  tituloDe,
  type Post,
  type Status,
} from "@/lib/conteudo-tipos";

type Contagem = { total: number; gravadas: number };

/* Quadro por status, a visão que responde "onde cada coisa travou".

   O status é trocável direto no card, sem abrir o post: mover coisa de coluna
   é o gesto mais frequente do quadro, e obrigar a abrir/salvar/voltar pra cada
   troca é o caminho mais curto pra ninguém mais atualizar status e o quadro
   virar ficção. Arrastar seria melhor ainda, e fica pra quando a direção
   estiver assentada (decisão do Yan em 11/08: desktop e MVP primeiro, polir
   depois de usar). */
export default function ConteudoQuadro({
  posts,
  contagens,
}: {
  posts: Post[];
  contagens: Record<string, Contagem>;
}) {
  return (
    <div className="conteudo-quadro">
      {STATUS_QUADRO.map((status) => {
        const doStatus = posts.filter((p) => p.status === status);
        return (
          <section key={status} className="conteudo-coluna">
            <header className="conteudo-coluna-topo">
              <span className="conteudo-coluna-titulo">{STATUS_INFO[status].rotulo}</span>
              <span className="conteudo-coluna-contagem">{doStatus.length}</span>
            </header>
            <p className="conteudo-coluna-ajuda">{STATUS_INFO[status].ajuda}</p>

            <div className="flex flex-col gap-2">
              {doStatus.map((post) => (
                <Card key={post.id} post={post} contagem={contagens[post.id]} />
              ))}
              {doStatus.length === 0 && <p className="conteudo-coluna-vazia">nada aqui</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ post, contagem }: { post: Post; contagem?: Contagem }) {
  const [pendente, iniciar] = useTransition();
  const perfil = perfilPorId(post.perfil);
  const data = dataDoPost(post);

  return (
    <article className="conteudo-card" style={{ opacity: pendente ? 0.5 : 1 }}>
      <Link href={"/painel/conteudo/" + post.id} className="conteudo-card-titulo">
        {tituloDe(post)}
      </Link>

      <div className="conteudo-card-meta">
        <span className="conteudo-ponto" style={{ background: perfil?.cor ?? "var(--ink-soft)" }} />
        <span>{perfil?.rotulo ?? post.perfil}</span>
        {post.formato && <span className="conteudo-card-sep">·</span>}
        {post.formato && <span>{post.formato}</span>}
      </div>

      <div className="conteudo-card-rodape">
        {data ? <span>{data.slice(8, 10) + "/" + data.slice(5, 7)}</span> : <span>sem data</span>}
        {contagem && contagem.total > 0 && (
          <span title="falas gravadas do roteiro">
            {contagem.gravadas}/{contagem.total} falas
          </span>
        )}
      </div>

      <Dropdown
        className="conteudo-status-card"
        rotuloAcessivel={"Status de " + tituloDe(post)}
        largura={230}
        valor={post.status}
        opcoes={[...STATUS_QUADRO, "descartado" as Status].map((s) => ({
          valor: s,
          rotulo: STATUS_INFO[s].rotulo,
          ajuda: STATUS_INFO[s].ajuda,
        }))}
        aoEscolher={(v) => {
          iniciar(() => {
            void mudarStatusAcao(post.id, v as Status);
          });
        }}
      />
    </article>
  );
}

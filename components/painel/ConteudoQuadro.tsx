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
  type PostResumo,
  type Status,
} from "@/lib/conteudo-tipos";

type Contagem = { total: number; gravadas: number };

/** Quantos cards uma coluna mostra antes de oferecer "mostrar todos".

    Não é altura de tela (a coluna rola sozinha desde 30/08), é custo de DOM:
    cada card carrega um `Dropdown` de cliente com estado e listeners próprios.
    Com 33 postados isso já é 33 dropdowns montados pra ver os três primeiros;
    na cadência de agosto, dezembro passaria de 90 numa coluna só.

    12 porque é mais do que cabe na tela de uma vez, então quem só olha nunca
    esbarra no limite, e quem procura algo antigo tem o link embaixo. */
const LIMITE_COLUNA = 12;

/* Quadro por status, a visão que responde "onde cada coisa travou".

   O status é trocável direto no card, sem abrir o post: mover coisa de coluna
   é o gesto mais frequente do quadro, e obrigar a abrir/salvar/voltar pra cada
   troca é o caminho mais curto pra ninguém mais atualizar status e o quadro
   virar ficção. Arrastar seria melhor ainda, e fica pra quando a direção
   estiver assentada (decisão do Yan em 11/08: desktop e MVP primeiro, polir
   depois de usar).

   **Altura (30/08/2026)**: o quadro para na altura da janela e cada coluna rola
   por dentro. Antes, a coluna mais cheia esticava a página inteira e as outras
   quatro viravam um rodapé de espaço vazio: rolar pra ver o 20º Postado tirava
   Ideia e Roteiro da tela, que é justamente a comparação que o quadro existe
   pra fazer. Como só o corpo da coluna rola, o pill de status e a contagem
   ficam parados no topo dela, sem precisar de `sticky`.

   Quem posiciona o dropdown de status já contava com isso: `usePopover` escuta
   scroll com `capture: true` exatamente porque quem rola são as colunas, não a
   janela. */
export default function ConteudoQuadro({
  posts,
  contagens,
  expandida,
  linksExpandir,
  linkRecolher,
}: {
  posts: PostResumo[];
  contagens: Record<string, Contagem>;
  /** Coluna que está mostrando tudo, quando alguém pediu. Vive na URL. */
  expandida?: string;
  /** Href por status que expande aquela coluna. Objeto e não função: função não
      atravessa a fronteira servidor/cliente (ver ConteudoLista). */
  linksExpandir: Record<string, string>;
  linkRecolher: string;
}) {
  return (
    <div className="conteudo-quadro">
      {STATUS_QUADRO.map((status) => {
        const doStatus = posts.filter((p) => p.status === status);
        const aberta = expandida === status;
        const visiveis = aberta ? doStatus : doStatus.slice(0, LIMITE_COLUNA);
        const escondidos = doStatus.length - visiveis.length;
        return (
          <section key={status} className="conteudo-coluna">
            {/* Título da coluna como pill colorida (Yan, 22/08/2026): é a
                mesma peça que já marcava o status no topo do post, então quem
                abre um post e volta pro quadro reconhece a etapa pela forma e
                pela cor, não relendo a palavra. A cor vem do próprio status
                (ver STATUS_INFO) e sobe pela variável, pra pill e contagem
                lerem a mesma. */}
            <header className="conteudo-coluna-topo">
              <span
                className="painel-badge conteudo-coluna-pill"
                style={{ ["--cor" as string]: STATUS_INFO[status].cor }}
              >
                {STATUS_INFO[status].rotulo}
              </span>
              <span className="conteudo-coluna-contagem">{doStatus.length}</span>
            </header>
            <p className="conteudo-coluna-ajuda">{STATUS_INFO[status].ajuda}</p>

            <div className="conteudo-coluna-corpo">
              {visiveis.map((post) => (
                <Card key={post.id} post={post} contagem={contagens[post.id]} />
              ))}
              {doStatus.length === 0 && <p className="conteudo-coluna-vazia">Nada aqui</p>}

              {escondidos > 0 && (
                <Link href={linksExpandir[status]} className="conteudo-coluna-mais">
                  Mostrar os {escondidos} restantes
                </Link>
              )}
              {aberta && doStatus.length > LIMITE_COLUNA && (
                <Link href={linkRecolher} className="conteudo-coluna-mais">
                  Mostrar menos
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ post, contagem }: { post: PostResumo; contagem?: Contagem }) {
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
        {data ? <span>{data.slice(8, 10) + "/" + data.slice(5, 7)}</span> : <span>Sem data</span>}
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

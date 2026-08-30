"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

/* O card, refeito em 30/08/2026 pra caber mais e dizer o mesmo.

   Era: título em até três linhas, uma linha de perfil, uma linha de data e um
   `<select>` de largura inteira embaixo. ~95px por card, ou seja, cinco cards
   por tela numa coluna.

   A referência de kanban é consistente nisto: o card é a CAPA, não a ficha.
   Ele responde o quê, de quem e quando; o resto mora na tela do post, a um
   clique. Duas coisas saíram por essa régua:

   1. **O título passou a caber numa linha só**, com reticências e o texto
      inteiro no `title`. Título de três linhas empurrava o próximo card pra
      fora da tela pra mostrar uma frase que ninguém lê inteira no quadro.
   2. **O status virou um botão de seta.** O valor dele é o nome da coluna em
      que o card está: escrever "Postado" dentro da coluna Postado gastava uma
      linha inteira pra repetir o cabeçalho. O gesto (mover de coluna) fica; o
      rótulo sai.

   Sobrou ~52px por card, quase o dobro de cards por tela.

   **O card inteiro clica** e abre o post, igual à linha da Lista. O título
   continua sendo um link de verdade pra que teclado, clique do meio e "abrir
   em nova aba" continuem funcionando, que é o que um `onClick` sozinho
   quebraria. O dropdown para o clique antes que ele vire navegação. */
function Card({ post, contagem }: { post: PostResumo; contagem?: Contagem }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const perfil = perfilPorId(post.perfil);
  const data = dataDoPost(post);
  const href = "/painel/conteudo/" + post.id;

  return (
    <article
      className="conteudo-card"
      style={{ opacity: pendente ? 0.5 : 1 }}
      onClick={() => router.push(href)}
    >
      <div className="conteudo-card-topo">
        <Link href={href} className="conteudo-card-titulo" title={tituloDe(post)}>
          {tituloDe(post)}
        </Link>

        {/* O `stopPropagation` nos dois eventos, e não só no clique: a lista do
            dropdown escolhe no `pointerdown` (ver Dropdown.tsx), então sem o de
            baixo o card navegaria antes de a escolha acontecer. */}
        <span
          className="conteudo-card-mover"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Dropdown
            compacto
            rotuloAcessivel={"Mover " + tituloDe(post) + ", agora em " + STATUS_INFO[post.status].rotulo}
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
        </span>
      </div>

      {/* Uma linha de meta em vez de duas: quem à esquerda, quando e quanto à
          direita. O nome do perfil encolhe com reticências antes de empurrar a
          data, porque a bolinha colorida já identifica de quem é. */}
      <div className="conteudo-card-meta">
        <span className="conteudo-card-quem">
          <span
            className="conteudo-ponto"
            style={{ background: perfil?.cor ?? "var(--ink-soft)" }}
          />
          <span className="conteudo-card-perfil">{perfil?.rotulo ?? post.perfil}</span>
        </span>

        <span className="conteudo-card-quando">
          {data ? data.slice(8, 10) + "/" + data.slice(5, 7) : "sem data"}
          {contagem && contagem.total > 0 && (
            <>
              <span className="conteudo-card-sep">·</span>
              <span title="falas gravadas do roteiro">
                {contagem.gravadas}/{contagem.total}
              </span>
            </>
          )}
        </span>
      </div>
    </article>
  );
}

import {
  STATUS,
  STATUS_INFO,
  dataDoPost,
  perfilPorId,
  tituloDe,
  type PostResumo,
  type Status,
} from "@/lib/conteudo-tipos";

/* A aba de Conteúdo no celular (02/09/2026, a partir de dois prints do Yan).

   ── Por que existe uma quarta forma ──

   As três visões são três formas de MONITOR. O quadro é grid de colunas lado a
   lado, o calendário é grade de 7 dias, e a lista é tabela de 6 colunas. Num
   celular de 390px as três só cabem rolando de lado, e o print mostrou o
   resultado: colunas cortadas na borda direita e nenhuma leitura possível sem
   arrastar a tela.

   Encolher qualquer uma delas não resolve, porque o que elas fazem é comparar
   ITENS na horizontal, e a horizontal é justamente o que o celular não tem.

   No celular sobra uma forma só: uma coluna de cartões. Então abaixo de 760px
   as três visões saem e entra esta, e o seletor de visão some junto (seletor
   com três opções que dão na mesma é ruído).

   ── Por que agrupado por status ──

   O pedido do Yan foi "ver de maneira organizada os conteúdos e status". O
   agrupamento por etapa entrega as duas coisas de uma vez e é a mesma leitura
   que o quadro dá no monitor: em que pé está cada coisa. A ordem das seções é a
   da esteira (Ideia → Postado), não a alfabética nem a de quantidade.

   Descartado entra como as outras quando tem post: pular a seção faria posts
   sumirem em silêncio de uma lista que promete mostrar o recorte inteiro.

   ── Por que sem paginação ──

   A Lista pagina de 25 em 25 porque ali a página é uma tela de comparação, e
   rolagem longa estraga a comparação. Aqui é o oposto: rolar é o gesto natural
   do aparelho, e paginar seria pedir dois toques pra ver o que o polegar
   alcança sozinho. Vêm todos os posts do recorte.

   ── Por que cada cartão tem "Gravar" ──

   O caminho que o Yan descreveu é achar o conteúdo e ler o roteiro pra gravar.
   Sem o atalho, isso passa obrigatoriamente pela tela de edição do post, que no
   celular é o que o segundo print mostra. Com ele, é um toque.

   Aparece em TODO cartão, inclusive nos que ainda não têm roteiro escrito. A
   alternativa seria adivinhar quem tem fala a partir do status, e status não é
   contagem de falas: uma Ideia pode ter falas e um Roteiro pode estar vazio.
   Quem não tem cai numa tela que diz isso e oferece escrever, que é uma
   resposta honesta; esconder o botão por palpite daria a resposta errada em
   silêncio. */

export default function ConteudoCartoes({
  posts,
  sufixo,
  termo,
  hrefLimparFiltros,
  temFiltro,
}: {
  posts: PostResumo[];
  /** Query do recorte atual, pendurada no link pro voltar preservar. */
  sufixo: string;
  termo?: string;
  hrefLimparFiltros: string;
  temFiltro: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="conteudo-cartoes">
        <p className="conteudo-vazio-inline">
          {temFiltro || termo
            ? "Nenhum post com os filtros ligados. "
            : "Nenhum post ainda."}
          {(temFiltro || termo) && (
            <a href={hrefLimparFiltros} className="conteudo-lista-vazia-limpar">
              Limpar os filtros
            </a>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="conteudo-cartoes">
      {STATUS.map((s) => {
        const doStatus = posts.filter((p) => p.status === s);
        if (doStatus.length === 0) return null;
        const info = STATUS_INFO[s as Status];

        return (
          <section key={s} className="conteudo-grupo">
            {/* A mesma pill colorida do quadro, da Lista e do topo do post: a
                etapa se reconhece pela cor em todo lugar do painel. O número ao
                lado responde "quanto tem aqui" sem obrigar a contar cartão. */}
            <h2 className="conteudo-grupo-titulo">
              <span
                className="painel-badge conteudo-status-pill"
                style={{ ["--cor" as string]: info.cor }}
              >
                {info.rotulo}
              </span>
              <span className="conteudo-grupo-conta">{doStatus.length}</span>
            </h2>

            <ul className="conteudo-cartao-lista">
              {doStatus.map((p) => {
                const perfil = perfilPorId(p.perfil);
                const data = dataDoPost(p);
                return (
                  <li key={p.id} className="conteudo-cartao">
                    {/* O título é o alvo grande, e ocupa a linha inteira: abrir
                        o post é o gesto principal do cartão. */}
                    <a
                      href={"/painel/conteudo/" + p.id + sufixo}
                      className="conteudo-cartao-abrir"
                    >
                      <span className="conteudo-cartao-titulo">{tituloDe(p)}</span>
                      <span className="conteudo-cartao-meta">
                        <span
                          className="conteudo-ponto"
                          style={{ background: perfil?.cor ?? "var(--ink-soft)" }}
                        />
                        {perfil?.dono ?? p.perfil}
                        {p.formato && <> · {p.formato}</>}
                        {data && <> · {data.split("-").reverse().join("/")}</>}
                      </span>
                    </a>

                    <a
                      href={"/painel/conteudo/" + p.id + "/gravar" + sufixo}
                      className="conteudo-cartao-gravar"
                    >
                      Gravar
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { salvarRoteiroAcao } from "@/app/painel/conteudo/acoes";
import { Check, Lixeira } from "@/components/icones";
import { avisar } from "@/components/painel/Avisos";
import CampoTexto from "@/components/painel/CampoTexto";
import Dropdown from "@/components/painel/Dropdown";
import { usePostShell } from "@/components/painel/PostShell";
import { FUNCAO_INFO, FUNCOES_FALA, type Fala } from "@/lib/conteudo-tipos";

/* Editor do roteiro, o miolo do painel de conteúdo.

   O roteiro é lista de falas porque a gravação é frase por frase (Yan, 11/08).
   Isso muda o que a tela é: não é um documento pra ler enquanto grava, é uma
   lista pra percorrer. Daí duas escolhas que valem estar escritas:

   1. A fala é a unidade, e o planejamento de cena pendura NELA, não no post.
      "Close na areia" só quer dizer alguma coisa colado na frase em que
      acontece.
   2. A cena vive dentro de um <details> fechado. O que se lê 90% do tempo é o
      roteiro corrido; abrir tudo de uma vez transformaria seis frases em três
      telas de formulário e ninguém conseguiria ler o texto como texto. O botão
      "abrir todas as cenas" existe pro dia de planejar, que é o outro modo.

   ── Autosave (21/08/2026) ──

   O botão "Salvar roteiro" saiu. A versão anterior deste comentário defendia o
   botão dizendo que gravar a meio caminho encheria o histórico de lixo, e o
   argumento não se sustentava: não existe histórico nenhum no schema, só a
   linha atual da fala. O que existia de verdade era risco de perder roteiro
   escrito quando a aba morresse antes do clique.

   ── Duas abas (22/08/2026) ──

   O autosave abriu um risco real e ele foi fechado. A versão anterior deste
   comentário avisava que "duas abas no mesmo post viram perda silenciosa",
   porque salvar apagava do banco toda fala que não estivesse na tela.

   Hoje o servidor só apaga o que ESTA tela mandou apagar (`removidas`), a fala
   nova volta com o id do banco e é adotada aqui, e fala que apareceu por outra
   aba entra no fim da lista com aviso. Testado com duas abas de verdade: as
   duas falas sobrevivem e cada uma enxerga a da outra.

   O que sobra, e é o limite aceito: se as duas abas editarem a MESMA fala, a
   última gravação vence naquela fala. É a colisão que não tem como evitar sem
   travar a linha, e é a única que a pessoa entende quando acontece. */

type Props = { postId: string; iniciais: Fala[] };

export default function RoteiroEditor({ postId, iniciais }: Props) {
  const { reportar } = usePostShell();
  const [falas, setFalas] = useState<Fala[]>(iniciais);
  const [abrirTodas, setAbrirTodas] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  /* Espelho do estado pros gatilhos que rodam de dentro de listeners
     registrados uma vez só (aba escondida, desmontagem): sem ele, eles
     enxergariam as falas da primeira renderização pra sempre. Atualizado dentro
     de `mexer`, nunca durante o render. */
  const atuais = useRef(falas);
  const sujo = useRef(false);
  const hora = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Ids que ESTA tela apagou. É a única coisa que o servidor pode apagar, e é
     o que impede o autosave de levar junto uma fala que outra aba criou. */
  const removidas = useRef<string[]>([]);

  const gravar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;
    /* Fotografa o que está indo. Se o usuário digitar durante a gravação, o
       `sujo` volta a true por conta do `mexer` e a próxima rodada leva o resto;
       o que não pode é adotar id em cima de uma lista que já mudou. */
    const enviadas = atuais.current;
    const apagando = removidas.current;
    removidas.current = [];
    reportar("roteiro", { estado: "salvando", hora: hora.current });
    try {
      const r = await salvarRoteiroAcao(
        postId,
        JSON.stringify(enviadas),
        JSON.stringify(apagando),
      );

      /* Adota os ids recém-criados, na ordem em que foram enviados. Sem este
         passo a fala nova continua sem id pra sempre e volta a ser recriada a
         cada gravação (medido em 22/08/2026: o id mudava a cada autosave). */
      if (r?.criadas?.length) {
        let k = 0;
        const comIds = atuais.current.map((f) => {
          if (f.id) return f;
          const criada = r.criadas[k++];
          return criada?.id ? { ...f, id: criada.id } : f;
        });
        atuais.current = comIds;
        setFalas(comIds);
      }

      /* Fala que apareceu no banco sem ter passado por aqui só pode ter vindo
         de outra aba. Entra no fim da lista e a pessoa fica sabendo, em vez de
         o trabalho existir e ser invisível até alguém recarregar. */
      if (r?.deOutraAba?.length) {
        const juntas = [...atuais.current, ...r.deOutraAba];
        atuais.current = juntas;
        setFalas(juntas);
        avisar(
          r.deOutraAba.length === 1
            ? "Outra aba adicionou 1 fala. Ela apareceu no fim do roteiro."
            : "Outra aba adicionou " + r.deOutraAba.length + " falas. Elas apareceram no fim do roteiro.",
        );
      }

      hora.current = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      reportar("roteiro", { estado: "salvo", hora: hora.current });
    } catch (e) {
      sujo.current = true;
      /* Devolve pra fila o que ia ser apagado: perder a intenção de apagar é
         chato, apagar sem querer é pior, mas engolir o erro e nunca mais tentar
         é o que faz o roteiro divergir do banco em silêncio. */
      removidas.current = [...apagando, ...removidas.current];
      reportar("roteiro", { estado: "erro", hora: hora.current });
      avisar(e instanceof Error ? e.message : "Não consegui salvar o roteiro.", "erro");
    }
  }, [postId, reportar]);

  function mexer(proximo: Fala[]) {
    const numeradas = proximo.map((f, i) => ({ ...f, ordem: i + 1 }));
    atuais.current = numeradas;
    setFalas(numeradas);
    /* A confirmação é guardada por índice, e mover ou apagar reordena a lista:
       sem limpar aqui, a pergunta ficaria apontando pra outra fala. */
    setConfirmando(null);

    sujo.current = true;
    reportar("roteiro", { estado: "sujo", hora: hora.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void gravar(), 900);
  }

  function agora() {
    if (timer.current) clearTimeout(timer.current);
    void gravar();
  }

  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") agora();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      if (timer.current) clearTimeout(timer.current);
      void gravar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravar]);

  function alterar(indice: number, campo: keyof Fala, valor: string | boolean) {
    mexer(falas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function adicionar() {
    mexer([
      ...falas,
      {
        ordem: falas.length + 1,
        texto: "",
        funcao: falas.length === 0 ? "gancho" : null,
        enquadramento: null,
        cenario: null,
        acao: null,
        broll: null,
        texto_tela: null,
        observacao: null,
        gravada: false,
      },
    ]);
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= falas.length) return;
    const copia = [...falas];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    mexer(copia);
  }

  function remover(indice: number) {
    const alvo = falas[indice];
    /* Só fala que já existe no banco entra na lista de apagar. Fala criada e
       apagada antes da primeira gravação nunca chegou lá, e mandar `undefined`
       viraria um filtro vazio. */
    if (alvo?.id) removidas.current = [...removidas.current, alvo.id];
    mexer(falas.filter((_, i) => i !== indice));
  }

  /* Toda fala pergunta antes de sumir (Yan, 22/08/2026).

     Até aqui, fala em branco sumia no clique, com o argumento de que não havia
     nada a perder e de que confirmar o vazio ensina a clicar em "sim" sem ler.
     O argumento é bom em tese e errado na prática desta tela: quem apaga uma
     fala recém-criada não sabe que ela estava vazia aos olhos do app (a cena
     pode estar preenchida, o texto não), e o botão respondendo às vezes com
     popup e às vezes com sumiço é imprevisível — que é pior que ser chato.

     A confirmação é a faixa dentro da própria fala, não um popup: a linha do
     roteiro é estreita e uma caixa flutuando ali empurraria as falas de baixo. */
  function pedirRemover(indice: number) {
    setConfirmando(indice);
  }

  const gravadas = falas.filter((f) => f.gravada).length;

  return (
    <section>
      <div className="conteudo-roteiro-barra">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
            Roteiro
          </h2>
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {falas.length === 0
              ? "Nenhuma fala ainda"
              : falas.length +
                (falas.length === 1 ? " fala · " : " falas · ") +
                gravadas +
                (gravadas === 1 ? " gravada" : " gravadas")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="conteudo-chip-acao"
            aria-pressed={abrirTodas}
            onClick={() => setAbrirTodas((v) => !v)}
          >
            {abrirTodas ? "Fechar cenas" : "Abrir todas as cenas"}
          </button>
          <button type="button" className="conteudo-chip-criar" onClick={adicionar}>
            + Fala
          </button>
        </div>
      </div>

      {falas.length === 0 && (
        <p className="conteudo-vazio-inline">
          Comece pela primeira frase que vai ser falada. A primeira costuma ser o gancho, e
          o app já marca ela assim.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {falas.map((fala, i) => (
          <li
            key={fala.id ?? "nova-" + i}
            className={"conteudo-fala" + (fala.gravada ? " conteudo-fala-ok" : "")}
          >
            {/* Marcar como gravada é o gesto que a Ge faz com o celular na mão,
                entre uma tomada e outra, e era uma caixinha de 15px sem rótulo
                (Yan, 22/08/2026). Virou um botão redondo com o número da fala
                dentro: um alvo só, de 28px, que já diz qual fala é e vira um
                ✓ verde quando gravada. Menos elemento na tela e mais área
                clicável ao mesmo tempo. */}
            <div className="conteudo-fala-lateral">
              <button
                type="button"
                className="conteudo-fala-marca"
                role="switch"
                aria-checked={fala.gravada}
                aria-label={"Fala " + (i + 1) + (fala.gravada ? ", gravada" : ", marcar como gravada")}
                title={fala.gravada ? "Gravada, clique pra desmarcar" : "Marcar como gravada"}
                onClick={() => alterar(i, "gravada", !fala.gravada)}
              >
                {fala.gravada ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {/* Cresce com o texto, como a legenda e a observação: a fala é o
                  que vai ser dito em voz alta, e ler metade dela dentro de uma
                  janelinha de duas linhas atrapalha justamente na hora de
                  conferir se soa bem. */}
              <CampoTexto
                className="conteudo-fala-texto"
                minimo={2}
                placeholder="A frase, do jeito exato que vai ser falada"
                valor={fala.texto}
                aoMudar={(v) => alterar(i, "texto", v)}
                aoSair={agora}
              />

              <div className="conteudo-fala-linha">
                <Dropdown
                  className="conteudo-fala-funcao"
                  rotuloAcessivel={"Função da fala " + (i + 1)}
                  vazio="Função da fala"
                  largura={280}
                  valor={fala.funcao ?? ""}
                  opcoes={[
                    { valor: "", rotulo: "Sem função", ajuda: "Ainda não decidi o papel desta frase" },
                    ...FUNCOES_FALA.map((f) => ({
                      valor: f,
                      rotulo: FUNCAO_INFO[f].rotulo,
                      ajuda: FUNCAO_INFO[f].ajuda,
                    })),
                  ]}
                  aoEscolher={(v) => alterar(i, "funcao", v)}
                />

                <details open={abrirTodas} className="conteudo-cena">
                  <summary className="conteudo-cena-resumo">{resumoDaCena(fala)}</summary>
                  <div className="conteudo-cena-campos">
                    <Campo
                      rotulo="Enquadramento"
                      valor={fala.enquadramento}
                      exemplo="close, plano médio, de costas"
                      aoMudar={(v) => alterar(i, "enquadramento", v)}
                      aoSair={agora}
                    />
                    <Campo
                      rotulo="Cenário"
                      valor={fala.cenario}
                      exemplo="praia, cozinha, quarto"
                      aoMudar={(v) => alterar(i, "cenario", v)}
                      aoSair={agora}
                    />
                    <Campo
                      rotulo="Ação"
                      valor={fala.acao}
                      exemplo="andando, sentada, servindo o chá"
                      aoMudar={(v) => alterar(i, "acao", v)}
                      aoSair={agora}
                    />
                    <Campo
                      rotulo="B-roll"
                      valor={fala.broll}
                      exemplo="o que entra por cima da fala"
                      aoMudar={(v) => alterar(i, "broll", v)}
                      aoSair={agora}
                    />
                    <Campo
                      rotulo="Texto na tela"
                      valor={fala.texto_tela}
                      exemplo="o que aparece escrito"
                      aoMudar={(v) => alterar(i, "texto_tela", v)}
                      aoSair={agora}
                    />
                    <Campo
                      rotulo="Observação"
                      valor={fala.observacao}
                      exemplo="direção, tom, pausa"
                      aoMudar={(v) => alterar(i, "observacao", v)}
                      aoSair={agora}
                    />
                  </div>
                </details>
              </div>

              {confirmando === i && (
                <div
                  className="conteudo-fala-confirma"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setConfirmando(null);
                  }}
                >
                  <span>Apagar esta fala?</span>
                  <button
                    type="button"
                    className="conteudo-confirma-sim"
                    onClick={() => remover(i)}
                  >
                    Apagar
                  </button>
                  <button
                    type="button"
                    className="conteudo-confirma-nao"
                    autoFocus
                    onClick={() => setConfirmando(null)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Alvos maiores sem ficarem maiores na tela: cada botão tem 26px
                de desenho e 26×36 de área clicável (o `::after` no CSS estica
                pros lados, onde há espaço sobrando e nenhum vizinho). Os
                glifos ↑ ↓ × viraram traços de verdade, que é o que permitiu
                encolher o desenho e ganhar clique ao mesmo tempo.

                Primeira e última fala não mostram a seta que não faz nada:
                botão desabilitado que continua ali é ruído, e nesta coluna o
                que sobra é justamente espaço pros outros dois. */}
            <div className="conteudo-fala-acoes">
              {i > 0 && (
                <button
                  type="button"
                  className="conteudo-mini"
                  title="Subir esta fala"
                  aria-label={"Subir a fala " + (i + 1)}
                  onClick={() => mover(i, -1)}
                >
                  <SetaMini para="cima" />
                </button>
              )}
              {i < falas.length - 1 && (
                <button
                  type="button"
                  className="conteudo-mini"
                  title="Descer esta fala"
                  aria-label={"Descer a fala " + (i + 1)}
                  onClick={() => mover(i, 1)}
                >
                  <SetaMini para="baixo" />
                </button>
              )}
              <button
                type="button"
                className="conteudo-mini conteudo-mini-perigo"
                title="Apagar esta fala"
                aria-label={"Apagar a fala " + (i + 1)}
                onClick={() => pedirRemover(i)}
              >
                <Lixeira className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* O resumo é o que fica visível com a cena fechada. Se nada foi planejado, ele
   diz isso em vez de mostrar um triângulo mudo: cena vazia num roteiro pronto
   pra gravar é informação, não ausência de informação. */
/* Seta de reordenar. Fica aqui e não em `icones.tsx` porque é a única seta
   simples do app: a `Seta` de lá é a de navegação, com haste e cabeça, e num
   botão de 26px ela vira borrão. */
function SetaMini({ para }: { para: "cima" | "baixo" }) {
  return (
    <svg
      aria-hidden
      className="h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={para === "baixo" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
    </svg>
  );
}

function resumoDaCena(f: Fala): string {
  const partes = [f.enquadramento, f.cenario, f.acao, f.broll, f.texto_tela].filter(
    (p) => p && p.trim() !== "",
  );
  return partes.length === 0 ? "Cena não planejada" : partes.join(" · ");
}

function Campo({
  rotulo,
  valor,
  exemplo,
  aoMudar,
  aoSair,
}: {
  rotulo: string;
  valor: string | null;
  exemplo: string;
  aoMudar: (v: string) => void;
  aoSair: () => void;
}) {
  return (
    <label className="conteudo-campo">
      <span>{rotulo}</span>
      <input
        type="text"
        value={valor ?? ""}
        placeholder={exemplo}
        onChange={(e) => aoMudar(e.target.value)}
        onBlur={aoSair}
      />
    </label>
  );
}

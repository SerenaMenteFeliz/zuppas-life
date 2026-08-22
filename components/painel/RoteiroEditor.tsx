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

   Fica um risco novo, e ele é real: **duas abas abertas no mesmo post viram
   perda silenciosa**, porque salvar apaga do banco toda fala que não está na
   tela, e agora isso acontece sozinho. Antes exigia um clique deliberado. A
   saída certa é marcar versão na linha e recusar escrita velha; até lá, isto
   está escrito aqui e na nota do projeto pra não ser descoberto pela Ge. */

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

  const gravar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;
    reportar("roteiro", { estado: "salvando", hora: hora.current });
    try {
      await salvarRoteiroAcao(postId, JSON.stringify(atuais.current));
      hora.current = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      reportar("roteiro", { estado: "salvo", hora: hora.current });
    } catch (e) {
      sujo.current = true;
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
    mexer(falas.filter((_, i) => i !== indice));
  }

  /* Fala em branco some no clique: não há nada pra perder, e pedir confirmação
     pra apagar o vazio ensina a clicar em "sim" sem ler, que é justamente o
     que estraga a confirmação onde ela importa. Fala escrita pergunta. */
  function pedirRemover(indice: number) {
    const f = falas[indice];
    const escrita = [
      f.texto,
      f.enquadramento,
      f.cenario,
      f.acao,
      f.broll,
      f.texto_tela,
      f.observacao,
    ].some((v) => (v ?? "").trim() !== "");

    if (!escrita) remover(indice);
    else setConfirmando(indice);
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
              ? "nenhuma fala ainda"
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
            {abrirTodas ? "fechar cenas" : "abrir todas as cenas"}
          </button>
          <button type="button" className="conteudo-chip-criar" onClick={adicionar}>
            + fala
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
                title={fala.gravada ? "gravada — clique pra desmarcar" : "marcar como gravada"}
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
                placeholder="a frase, do jeito exato que vai ser falada"
                valor={fala.texto}
                aoMudar={(v) => alterar(i, "texto", v)}
                aoSair={agora}
              />

              <div className="conteudo-fala-linha">
                <Dropdown
                  className="conteudo-fala-funcao"
                  rotuloAcessivel={"Função da fala " + (i + 1)}
                  vazio="função da fala"
                  largura={280}
                  valor={fala.funcao ?? ""}
                  opcoes={[
                    { valor: "", rotulo: "sem função", ajuda: "ainda não decidi o papel desta frase" },
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
                  title="subir esta fala"
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
                  title="descer esta fala"
                  aria-label={"Descer a fala " + (i + 1)}
                  onClick={() => mover(i, 1)}
                >
                  <SetaMini para="baixo" />
                </button>
              )}
              <button
                type="button"
                className="conteudo-mini conteudo-mini-perigo"
                title="apagar esta fala"
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
  return partes.length === 0 ? "cena não planejada" : partes.join(" · ");
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

"use client";

import { useState, useTransition } from "react";
import { salvarRoteiroAcao } from "@/app/painel/conteudo/acoes";
import { FUNCOES_FALA, type Fala } from "@/lib/conteudo-tipos";

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

   Salva tudo de uma vez, com botão explícito. Salvar a cada tecla parece
   moderno e é ruim aqui: o texto está sendo escrito, e gravar versão a meio
   caminho enche o histórico de lixo sem nenhum ganho real. */

type Props = { postId: string; iniciais: Fala[] };

export default function RoteiroEditor({ postId, iniciais }: Props) {
  const [falas, setFalas] = useState<Fala[]>(iniciais);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrirTodas, setAbrirTodas] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [salvando, iniciar] = useTransition();

  function mexer(proximo: Fala[]) {
    setFalas(proximo.map((f, i) => ({ ...f, ordem: i + 1 })));
    setSujo(true);
    setErro(null);
    /* A confirmação é guardada por índice, e mover ou apagar reordena a lista:
       sem limpar aqui, a pergunta ficaria apontando pra outra fala. */
    setConfirmando(null);
  }

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

  function salvar() {
    setErro(null);
    iniciar(async () => {
      try {
        await salvarRoteiroAcao(postId, JSON.stringify(falas));
        setSujo(false);
      } catch (e) {
        /* Erro aparece na tela, não só no console. Roteiro que some sem avisar
           é a mesma classe de falha silenciosa que custou 23 leads em 04/08. */
        setErro(e instanceof Error ? e.message : "Não consegui salvar o roteiro.");
      }
    });
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
          <button type="button" className="chip" onClick={() => setAbrirTodas((v) => !v)}>
            {abrirTodas ? "fechar cenas" : "abrir todas as cenas"}
          </button>
          <button type="button" className="chip" onClick={adicionar}>
            + fala
          </button>
          <button
            type="button"
            className="conteudo-botao"
            onClick={salvar}
            disabled={salvando || !sujo}
          >
            {salvando ? "salvando..." : sujo ? "Salvar roteiro" : "Salvo"}
          </button>
        </div>
      </div>

      {erro && <p className="conteudo-erro">{erro}</p>}

      {falas.length === 0 && (
        <p className="conteudo-vazio-inline">
          Comece pela primeira frase que vai ser falada. A primeira costuma ser o gancho, e
          o app já marca ela assim.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {falas.map((fala, i) => (
          <li key={fala.id ?? "nova-" + i} className="conteudo-fala">
            <div className="conteudo-fala-lateral">
              <span className="conteudo-fala-numero">{i + 1}</span>
              <label className="conteudo-fala-gravada" title="marcar como gravada">
                <input
                  type="checkbox"
                  checked={fala.gravada}
                  onChange={(e) => alterar(i, "gravada", e.target.checked)}
                />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <textarea
                className="conteudo-fala-texto"
                rows={2}
                placeholder="a frase, do jeito exato que vai ser falada"
                value={fala.texto}
                onChange={(e) => alterar(i, "texto", e.target.value)}
              />

              <div className="conteudo-fala-linha">
                <select
                  className="conteudo-select"
                  aria-label={"Função da fala " + (i + 1)}
                  value={fala.funcao ?? ""}
                  onChange={(e) => alterar(i, "funcao", e.target.value)}
                >
                  <option value="">função</option>
                  {FUNCOES_FALA.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <details open={abrirTodas} className="conteudo-cena">
                  <summary className="conteudo-cena-resumo">{resumoDaCena(fala)}</summary>
                  <div className="conteudo-cena-campos">
                    <Campo
                      rotulo="Enquadramento"
                      valor={fala.enquadramento}
                      exemplo="close, plano médio, de costas"
                      aoMudar={(v) => alterar(i, "enquadramento", v)}
                    />
                    <Campo
                      rotulo="Cenário"
                      valor={fala.cenario}
                      exemplo="praia, cozinha, quarto"
                      aoMudar={(v) => alterar(i, "cenario", v)}
                    />
                    <Campo
                      rotulo="Ação"
                      valor={fala.acao}
                      exemplo="andando, sentada, servindo o chá"
                      aoMudar={(v) => alterar(i, "acao", v)}
                    />
                    <Campo
                      rotulo="B-roll"
                      valor={fala.broll}
                      exemplo="o que entra por cima da fala"
                      aoMudar={(v) => alterar(i, "broll", v)}
                    />
                    <Campo
                      rotulo="Texto na tela"
                      valor={fala.texto_tela}
                      exemplo="o que aparece escrito"
                      aoMudar={(v) => alterar(i, "texto_tela", v)}
                    />
                    <Campo
                      rotulo="Observação"
                      valor={fala.observacao}
                      exemplo="direção, tom, pausa"
                      aoMudar={(v) => alterar(i, "observacao", v)}
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

            <div className="conteudo-fala-acoes">
              <button type="button" className="conteudo-mini" title="subir" onClick={() => mover(i, -1)}>
                ↑
              </button>
              <button type="button" className="conteudo-mini" title="descer" onClick={() => mover(i, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="conteudo-mini"
                title="remover"
                onClick={() => pedirRemover(i)}
              >
                ×
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
}: {
  rotulo: string;
  valor: string | null;
  exemplo: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <label className="conteudo-campo">
      <span>{rotulo}</span>
      <input
        type="text"
        value={valor ?? ""}
        placeholder={exemplo}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </label>
  );
}

"use client";

import { useMemo, useState } from "react";
import Agendar from "@/components/Agendar";
import Linha from "@/components/Linha";
import { Corrente, Rotulo, SeletorPessoa, Vazio } from "@/components/ui";
import { corrente, ehDe, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import { haQuantoTempo, horaDoDia, porExtenso, quandoFalta } from "@/lib/datas";
import { linkDoVault } from "@/lib/dados";
import {
  alternarConclusao,
  definirPessoa,
  desagendar,
  mudarStatusPendencia,
  useHoje,
  useZuppas,
} from "@/lib/store";
import {
  BLOCOS,
  BLOCO_JANELA,
  BLOCO_LABEL,
  type Bloco,
  type Pendencia,
} from "@/lib/types";

/* "Hoje, e é meu" — a superfície pessoal.

   Celular: coluna única, sem kanban, sem filtro de projeto na entrada. O login
   já responde "quem sou eu" (por ora o seletor no rodapé), então a tela não
   começa pedindo escolha. O que a Liz abre às 7h não é um quadro de trabalho, é
   a resposta pra "tem alguma coisa minha hoje?".

   As abas de manhã, tarde e noite existem porque o dia da casa é organizado em
   janelas, não em horários: a [[Rotina - Família (Semana 1)]] diz isso com todas
   as letras. "Tudo" continua sendo a aba de entrada, porque a primeira pergunta
   da manhã é o dia inteiro, e só depois é a próxima hora. */

type Aba = "tudo" | Bloco;

export default function Hoje() {
  const estado = useZuppas();
  const hoje = useHoje();

  /* Entra sempre em "tudo", e não no bloco da hora atual. A primeira pergunta
     de quem abre é o dia inteiro; filtrar por parte do dia é o segundo toque,
     não o primeiro. */
  const [aba, setAba] = useState<Aba>("tudo");
  const [soMeu, setSoMeu] = useState(true);

  const concluidas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const ocorrencias = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  const visiveis = useMemo(() => {
    let lista = ocorrencias;
    if (soMeu) lista = lista.filter((o) => ehDe(o, estado.eu));
    if (aba !== "tudo") lista = lista.filter((o) => o.bloco === aba);
    return lista;
  }, [ocorrencias, soMeu, aba, estado.eu]);

  const dias = useMemo(
    () => corrente(hoje, estado.itens, concluidas),
    [hoje, estado.itens, concluidas]
  );

  const ancoras = ocorrencias.filter((o) => o.ancora);
  const ancorasFeitas = ancoras.filter((o) => concluidas.has(o.chave)).length;

  const abertas = visiveis.filter((o) => !concluidas.has(o.chave));
  const feitas = visiveis.filter((o) => concluidas.has(o.chave));

  const minhasPendencias = estado.pendencias.filter(
    (p) => p.responsavel === estado.eu && p.status !== "concluida"
  );

  const bloqueio = estado.pendencias.find((p) => p.bloqueio && p.status !== "concluida");

  const saudacao =
    horaDoDia() < 12 ? "Bom dia" : horaDoDia() < 18 ? "Boa tarde" : "Boa noite";

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1500px] lg:px-10 lg:pt-10">
        <header className="mb-6 lg:mb-8 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <p className="tv-rotulo mb-2">{porExtenso(hoje)}</p>
            <h1
              className="text-3xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {saudacao}, {estado.eu}.
            </h1>
            <p className="mt-1 text-sm lg:text-base" style={{ color: "var(--ink-soft)" }}>
              {abertas.length === 0
                ? "Nada em aberto agora. Aproveita."
                : `${abertas.length} ${abertas.length === 1 ? "coisa" : "coisas"} em aberto.`}
            </p>
          </div>

          <div className="mt-4 lg:mt-0">
            <Corrente dias={dias} />
            <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
              Âncoras de hoje: {ancorasFeitas} de {ancoras.length}
              {ancorasFeitas === ancoras.length && ancoras.length > 0
                ? ". O dia contou."
                : ""}
            </p>
          </div>
        </header>

        {/* Abas do dia e escopo */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {(["tudo", ...BLOCOS] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`aba ${a === aba ? "aba-ativa" : ""}`}
            >
              {a === "tudo" ? "Tudo" : BLOCO_LABEL[a]}
            </button>
          ))}

          <button
            onClick={() => setSoMeu((v) => !v)}
            className={`aba ml-auto ${soMeu ? "" : "aba-ativa"}`}
          >
            {soMeu ? "Ver a casa toda" : "Só o que é meu"}
          </button>
        </div>

        {aba !== "tudo" && (
          <p className="mb-3 text-xs" style={{ color: "var(--ink-soft)" }}>
            {BLOCO_LABEL[aba]}, {BLOCO_JANELA[aba]}. Janela, não horário.
          </p>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <section>
              {abertas.length === 0 ? (
                <Vazio>
                  {soMeu
                    ? "Nada seu por aqui. Toque em ver a casa toda pra enxergar o resto."
                    : "Nada em aberto neste recorte."}
                </Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {abertas.map((o) => (
                    <Linha
                      key={o.chave}
                      ocorrencia={o}
                      feita={false}
                      aoAlternar={() => alternarConclusao(o.id, hoje, estado.eu)}
                      aoRemover={o.removivel ? () => desagendar(o.id) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>

            {feitas.length > 0 && (
              <section>
                <Rotulo>Já foi ({feitas.length})</Rotulo>
                <ul className="flex flex-col gap-2">
                  {feitas.map((o) => (
                    <Linha
                      key={o.chave}
                      ocorrencia={o}
                      feita
                      aoAlternar={() => alternarConclusao(o.id, hoje, estado.eu)}
                      aoRemover={o.removivel ? () => desagendar(o.id) : undefined}
                    />
                  ))}
                </ul>
              </section>
            )}

            <Agendar data={hoje} eu={estado.eu} />
          </div>

          {/* Pendências: coisa sem dia marcado, que é onde a casa trava */}
          <aside className="mt-8 flex flex-col gap-6 lg:mt-0">
            <section>
              <Rotulo>Suas pendências</Rotulo>
              {minhasPendencias.length === 0 ? (
                <Vazio>Nenhuma pendência sua.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {minhasPendencias.map((p) => (
                    <CartaoPendencia key={p.id} pendencia={p} hoje={hoje} />
                  ))}
                </ul>
              )}
            </section>

            {bloqueio && (
              <section className="surface-card-dark p-5">
                <p
                  className="tv-rotulo mb-2"
                  style={{ color: "var(--surface-dark-foreground)", opacity: 0.6 }}
                >
                  O que está travando
                </p>
                <p
                  className="text-[1.1rem] leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {bloqueio.titulo}
                </p>
                <p className="mt-1.5 text-sm" style={{ opacity: 0.7 }}>
                  {bloqueio.nota} · {bloqueio.responsavel}
                </p>
              </section>
            )}
          </aside>
        </div>

        <footer
          className="mt-8 border-t pt-5"
          style={{ borderColor: "var(--line)" }}
        >
          <SeletorPessoa eu={estado.eu} aoTrocar={definirPessoa} />
        </footer>
      </div>
    </main>
  );
}

/* Pendência não tem dia, tem idade.

   O "parada há N dias" é a mecânica social que a arquitetura prometia desde
   20/07 e que nunca tinha sido implementada: o campo `atualizado` era gravado
   em toda pendência e nenhuma tela mostrava. Passando de duas semanas o texto
   muda de cor, porque a partir dali não é atraso, é abandono. */
function CartaoPendencia({ pendencia, hoje }: { pendencia: Pendencia; hoje: string }) {
  const p = pendencia;
  const parada = haQuantoTempo(p.atualizado, hoje);
  const antiga = p.atualizado < hoje && parada.includes("semana");
  const muitoAntiga = parada.includes("mês") || parada.includes("meses");

  return (
    <li className="glass-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[1.02rem] leading-snug">{p.titulo}</span>
        {p.status === "bloqueada" && (
          <span
            className="mt-0.5 flex-none rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-wider"
            style={{ background: "var(--terracotta)", color: "#fff" }}
          >
            travada
          </span>
        )}
      </div>

      {p.nota && (
        <p
          className="mt-1.5 text-[0.82rem] leading-snug"
          style={{ color: "var(--ink-soft)" }}
        >
          {p.nota}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={`parada ${antiga || muitoAntiga ? "parada-antiga" : ""}`}
        >
          parada {parada}
        </span>
        {p.prazo && (
          <span className="parada">prazo {quandoFalta(p.prazo, hoje)}</span>
        )}
        <span className="parada uppercase tracking-wider">{p.projeto}</span>

        <button
          onClick={() => mudarStatusPendencia(p.id, "concluida")}
          className="chip ml-auto"
        >
          Concluir
        </button>
      </div>

      {p.vaultNota && (
        <a
          href={linkDoVault(p.vaultNota)}
          className="mt-2 text-[0.7rem] underline underline-offset-4"
          style={{ color: "var(--ink-soft)" }}
        >
          abrir no vault
        </a>
      )}
    </li>
  );
}

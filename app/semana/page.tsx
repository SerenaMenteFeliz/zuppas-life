"use client";

import { useMemo, useState } from "react";
import Agendar from "@/components/Agendar";
import { Avatar, Rotulo } from "@/components/ui";
import { Check, Relogio } from "@/components/icones";
import { ehDe, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import {
  curta,
  diasDaSemana,
  haQuantoTempo,
  nomeDoDiaCurto,
  porExtenso,
  semanaISO,
  somarDias,
} from "@/lib/datas";
import { alternarConclusao, desagendar, useHoje, useZuppas } from "@/lib/store";
import {
  BLOCOS,
  BLOCO_LABEL,
  CATEGORIA_LABEL,
  PESSOAS,
  type Categoria,
  type Dono,
  type Ocorrencia,
} from "@/lib/types";

/* A semana: tudo que tem que ser feito, de quem é, e em que dia.

   É a tela que responde "o que vem por aí" sem ninguém precisar perguntar. Dois
   filtros e só dois, porque filtro demais é a porta de entrada do kanban que
   este projeto decidiu não ser: por pessoa (de quem é cada coisa) e por tipo
   (só o Biro, só a casa, só compromisso).

   As pendências entram numa faixa separada de propósito. Elas não têm dia, e
   fingir que têm foi o erro do quadro branco: item sem data escrito num dia
   qualquer some da cabeça de todo mundo. */

const CATEGORIAS_FILTRO: Categoria[] = [
  "ancora",
  "biro",
  "casa",
  "escola",
  "compromisso",
  "lembrete",
  "pessoal",
];

export default function Semana() {
  const estado = useZuppas();
  const hoje = useHoje();

  const [deslocamento, setDeslocamento] = useState(0);
  const [pessoa, setPessoa] = useState<Dono | "Todos">("Todos");
  const [categoria, setCategoria] = useState<Categoria | "Tudo">("Tudo");

  const referencia = somarDias(hoje, deslocamento * 7);
  const dias = useMemo(() => diasDaSemana(referencia), [referencia]);

  const concluidas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const porDia = useMemo(() => {
    return dias.map((dia) => {
      let lista = ocorrenciasDoDia(dia, estado.itens, estado.compromissos);
      if (pessoa !== "Todos") {
        lista =
          pessoa === "Casa"
            ? lista.filter((o) => o.dono === "Casa")
            : lista.filter((o) => ehDe(o, pessoa));
      }
      if (categoria !== "Tudo") lista = lista.filter((o) => o.categoria === categoria);
      return { dia, lista };
    });
  }, [dias, estado.itens, estado.compromissos, pessoa, categoria]);

  const total = porDia.reduce((s, d) => s + d.lista.length, 0);
  const feitas = porDia.reduce(
    (s, d) => s + d.lista.filter((o) => concluidas.has(o.chave)).length,
    0
  );

  const pendencias = estado.pendencias.filter((p) => {
    if (p.status === "concluida") return false;
    if (categoria !== "Tudo" && categoria !== "pendencia") return false;
    if (pessoa === "Todos") return true;
    if (pessoa === "Casa") return false;
    return p.responsavel === pessoa;
  });

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1700px] lg:px-8 lg:pt-10">
        <header className="mb-5">
          <p className="tv-rotulo mb-2">Semana {semanaISO(referencia)}</p>
          <h1
            className="text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
            {curta(dias[0])} a {curta(dias[6])}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            {total} {total === 1 ? "coisa" : "coisas"} na semana, {feitas} já {feitas === 1 ? "feita" : "feitas"}.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button className="chip" onClick={() => setDeslocamento((d) => d - 1)}>
              ← anterior
            </button>
            {deslocamento !== 0 && (
              <button className="chip" onClick={() => setDeslocamento(0)}>
                esta semana
              </button>
            )}
            <button className="chip" onClick={() => setDeslocamento((d) => d + 1)}>
              próxima →
            </button>
          </div>
        </header>

        {/* Filtros: de quem é, e de que tipo */}
        <div className="mb-5 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            {(["Todos", "Casa", ...PESSOAS] as (Dono | "Todos")[]).map((p) => (
              <button
                key={p}
                onClick={() => setPessoa(p)}
                className={`chip ${p === pessoa ? "chip-ativo" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(["Tudo", ...CATEGORIAS_FILTRO, "pendencia"] as (Categoria | "Tudo")[]).map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`chip ${c === categoria ? "chip-ativo" : ""}`}
                >
                  {c === "Tudo" ? "Tudo" : CATEGORIA_LABEL[c]}
                </button>
              )
            )}
          </div>
        </div>

        {/* Os 7 dias. Empilhados no celular, lado a lado no desktop. */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-7 lg:items-start lg:gap-3">
          {porDia.map(({ dia, lista }) => (
            <DiaDaSemana
              key={dia}
              dia={dia}
              hoje={hoje}
              ocorrencias={lista}
              concluidas={concluidas}
              aoAlternar={(o) => alternarConclusao(o.id, dia, estado.eu)}
              aoRemover={(o) => desagendar(o.id)}
            />
          ))}
        </div>

        <div className="mt-6">
          <Agendar data={dias[0] > hoje ? dias[0] : hoje} eu={estado.eu} />
        </div>

        {/* Sem dia marcado */}
        <section className="mt-8">
          <Rotulo>Sem dia marcado ({pendencias.length})</Rotulo>
          {pendencias.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Nada solto neste filtro.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-3">
              {pendencias.map((p) => (
                <li key={p.id} className="glass-card flex flex-col gap-1.5 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Avatar dono={p.responsavel} tamanho={24} />
                    <span className="text-[0.95rem] leading-snug">{p.titulo}</span>
                  </div>
                  <span className="parada">
                    {p.projeto} · parada {haQuantoTempo(p.atualizado, hoje)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function DiaDaSemana({
  dia,
  hoje,
  ocorrencias,
  concluidas,
  aoAlternar,
  aoRemover,
}: {
  dia: string;
  hoje: string;
  ocorrencias: Ocorrencia[];
  concluidas: Set<string>;
  aoAlternar: (o: Ocorrencia) => void;
  aoRemover: (o: Ocorrencia) => void;
}) {
  const ehHoje = dia === hoje;
  const passou = dia < hoje;
  const abertas = ocorrencias.filter((o) => !concluidas.has(o.chave)).length;

  return (
    <section
      className={`glass-card p-3.5 ${ehHoje ? "glass-card-strong" : ""}`}
      style={{
        borderColor: ehHoje ? "var(--accent)" : undefined,
        opacity: passou && abertas === 0 ? 0.6 : 1,
      }}
    >
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <div>
          <p
            className="text-[0.7rem] uppercase tracking-widest"
            style={{ color: ehHoje ? "var(--accent)" : "var(--ink-soft)" }}
          >
            {nomeDoDiaCurto(dia)}
          </p>
          <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
            {dia.slice(8, 10)}
          </p>
        </div>
        {abertas > 0 && (
          <span className="parada">{abertas} aberta{abertas > 1 ? "s" : ""}</span>
        )}
      </header>

      {ocorrencias.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--ink-soft)", opacity: 0.7 }}>
          livre
        </p>
      ) : (
        BLOCOS.map((bloco) => {
          const doBloco = ocorrencias.filter((o) => o.bloco === bloco);
          if (doBloco.length === 0) return null;
          return (
            <div key={bloco} className="mb-2.5 last:mb-0">
              <p
                className="mb-1 text-[0.62rem] uppercase tracking-widest"
                style={{ color: "var(--ink-soft)", opacity: 0.8 }}
              >
                {BLOCO_LABEL[bloco]}
              </p>
              <ul className="flex flex-col gap-1">
                {doBloco.map((o) => {
                  const feita = concluidas.has(o.chave);
                  return (
                    <li key={o.chave} className="flex items-start gap-1.5">
                      <button
                        onClick={() => aoAlternar(o)}
                        className="mt-[0.15rem] flex h-4 w-4 flex-none items-center justify-center rounded-full border"
                        style={{
                          borderColor: feita ? "var(--accent)" : "var(--line)",
                          background: feita ? "var(--accent)" : "transparent",
                          color: "var(--accent-foreground)",
                        }}
                        aria-label={`${feita ? "Desmarcar" : "Marcar"} ${o.titulo} em ${porExtenso(dia)}`}
                      >
                        {feita && <Check className="h-2.5 w-2.5" />}
                      </button>

                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[0.8rem] leading-snug"
                          style={{
                            opacity: feita ? 0.45 : 1,
                            textDecoration: feita ? "line-through" : "none",
                          }}
                        >
                          {o.titulo}
                        </span>
                        <span
                          className="flex items-center gap-1 text-[0.65rem]"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          {o.horario && (
                            <>
                              <Relogio className="h-2.5 w-2.5" />
                              {o.horario}
                            </>
                          )}
                          <span>{o.dono}</span>
                        </span>
                      </span>

                      {o.removivel && (
                        <button
                          onClick={() => aoRemover(o)}
                          className="text-[0.65rem]"
                          style={{ color: "var(--ink-soft)" }}
                          aria-label={`Apagar ${o.titulo}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

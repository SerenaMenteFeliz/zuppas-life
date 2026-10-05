"use client";

import { useMemo, useState, type FormEvent } from "react";
import Marcas from "@/components/quadro/Marcas";
import { curta, diasDaSemana, nomeDoDiaCurto, porExtenso, somarDias } from "@/lib/datas";
import {
  blocoDoHorario,
  chaveMarca,
  diaDoQuadro,
  indexarMarcacoes,
} from "@/lib/quadro-itens";
import { definirPessoa, useHoje, useZuppas } from "@/lib/store";
import { useQuadro } from "@/lib/useQuadro";
import {
  BLOCOS,
  COR_PESSOA,
  FAIXAS,
  FAIXA_LABEL,
  INICIAL,
  PESSOAS,
  faixaDe,
  type Bloco,
  type Dono,
} from "@/lib/types";

/* Marcar o Quadro da semana, no desktop.

   O dia escolhido, por período, igual à TV mas clicável; ao lado, agendar.
   Quem está marcando é escolhido uma vez e fica lembrado neste aparelho (o
   "eu" do app, que continua no navegador: é preferência do aparelho, não dado
   da casa).

   Clicar marca em seu nome; clicar de novo desfaz só a sua marca. Dá pra
   marcar dias que já passaram (o "esqueci de marcar ontem"), nunca dias que
   ainda não chegaram. */

const BLOCO_LABEL: Record<Bloco, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

export default function Marcar() {
  const hoje = useHoje();
  const { eu } = useZuppas();
  const [deslocamento, setDeslocamento] = useState(0);
  const dias = diasDaSemana(somarDias(hoje, deslocamento * 7));
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const dia = escolhido && dias.includes(escolhido) ? escolhido : dias.includes(hoje) ? hoje : dias[0];

  const { marcacoes, agenda, carregado, erro, alternar, agendar, desagendar } = useQuadro(
    dias[0],
    dias[6]
  );
  const quem = useMemo(() => indexarMarcacoes(marcacoes), [marcacoes]);
  const doDia = diaDoQuadro(dia, agenda);
  const podeMarcar = dia <= hoje;

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-[1400px] px-5 pt-8 lg:px-10 lg:pt-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tv-rotulo mb-2">{porExtenso(hoje)}</p>
            <h1
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              Marcar
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="chip" onClick={() => setDeslocamento((d) => d - 1)}>
              ← anterior
            </button>
            <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {curta(dias[0])} a {curta(dias[6])}
            </span>
            <button
              type="button"
              className="chip"
              onClick={() => setDeslocamento((d) => d + 1)}
              disabled={deslocamento >= 2}
            >
              próxima →
            </button>
            {deslocamento !== 0 && (
              <button type="button" className="chip chip-ativo" onClick={() => setDeslocamento(0)}>
                esta semana
              </button>
            )}
          </div>
        </header>

        <section className="glass-card mb-4 flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Marcando como
          </span>
          {PESSOAS.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip flex items-center gap-2 ${eu === p ? "chip-ativo" : ""}`}
              onClick={() => definirPessoa(p)}
            >
              <span className="quadro-inicial" style={{ background: COR_PESSOA[p] }}>
                {INICIAL[p]}
              </span>
              {p}
            </button>
          ))}
        </section>

        <nav className="mb-6 grid grid-cols-7 gap-2" aria-label="Dia">
          {dias.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setEscolhido(d)}
              className={`marcar-dia ${d === dia ? "marcar-dia-ativo" : ""} ${d === hoje ? "marcar-dia-hoje" : ""}`}
            >
              <span>{d === hoje ? "hoje" : nomeDoDiaCurto(d)}</span>
              <b>{Number(d.slice(8, 10))}</b>
            </button>
          ))}
        </nav>

        {erro && (
          <p className="mb-4 text-sm" role="alert" style={{ color: "var(--terracotta)" }}>
            {erro}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="glass-card p-4 lg:p-6">
            {!carregado ? (
              <p style={{ color: "var(--ink-soft)" }}>Carregando…</p>
            ) : (
              FAIXAS.map((faixa) => {
                const lista = doDia.filter((o) => faixaDe(o) === faixa);
                if (lista.length === 0) return null;
                return (
                  <div key={faixa} className="mb-5 last:mb-0">
                    <h2 className="tv-rotulo mb-2">{FAIXA_LABEL[faixa]}</h2>
                    <ul className="flex flex-col gap-1">
                      {lista.map((o) => {
                        const pessoas = quem.get(chaveMarca(o.id, o.data)) ?? [];
                        return (
                          <li key={o.chave} className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!podeMarcar}
                              className={`marcar-item ${pessoas.length ? "marcar-feito" : ""} ${o.removivel ? "marcar-agendado" : ""}`}
                              onClick={() =>
                                alternar({ item: o.id, data: o.data, parte: "", pessoa: eu })
                              }
                              title={podeMarcar ? "Marcar em seu nome" : "Ainda não chegou"}
                            >
                              <Marcas pessoas={pessoas} eu={eu} />
                              <span className="marcar-hora">{o.horario ?? ""}</span>
                              <span className="flex-1 text-left">{o.titulo}</span>
                              {o.removivel && <span className="marcar-tag">agendado</span>}
                            </button>
                            {o.removivel && (
                              <button
                                type="button"
                                className="chip"
                                onClick={() => desagendar(o.id)}
                                aria-label={`Apagar ${o.titulo}`}
                              >
                                apagar
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
            {!podeMarcar && (
              <p className="mt-4 text-xs" style={{ color: "var(--ink-soft)" }}>
                Dia que ainda não chegou: dá pra ver e agendar, não dá pra marcar.
              </p>
            )}
          </section>

          <FormAgendar dia={dia} dias={dias} eu={eu} agendar={agendar} />
        </div>

        <p className="mt-4 text-xs" style={{ color: "var(--ink-soft)" }}>
          Clique num item pra marcar em seu nome; clique de novo pra desfazer só a sua marca. O que
          for marcado ou agendado aqui aparece na TV em até 30 segundos.
        </p>
      </div>
    </main>
  );
}

function FormAgendar({
  dia,
  dias,
  eu,
  agendar,
}: {
  dia: string;
  dias: string[];
  eu: (typeof PESSOAS)[number];
  agendar: ReturnType<typeof useQuadro>["agendar"];
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [horario, setHorario] = useState("");
  const [bloco, setBloco] = useState<Bloco>("manha");
  const [para, setPara] = useState<Dono>("Casa");
  const [enviando, setEnviando] = useState(false);
  const dataFinal = data && dias.includes(data) ? data : dia;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setEnviando(true);
    const ok = await agendar({
      titulo: titulo.trim(),
      data: dataFinal,
      horario: horario || null,
      bloco: horario ? blocoDoHorario(horario) : bloco,
      para,
      criado_por: eu,
    });
    setEnviando(false);
    if (ok) {
      setTitulo("");
      setHorario("");
    }
  }

  return (
    <form onSubmit={enviar} className="glass-card flex flex-col gap-3 self-start p-4 lg:p-5">
      <h2 className="tv-rotulo">Agendar</h2>
      <input
        className="campo"
        placeholder="O quê? (dentista, reunião da escola...)"
        value={titulo}
        maxLength={120}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        Dia
        <select className="campo" value={dataFinal} onChange={(e) => setData(e.target.value)}>
          {dias.map((d) => (
            <option key={d} value={d}>
              {porExtenso(d)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        Horário (se tiver)
        <input
          className="campo"
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
        />
      </label>
      {!horario && (
        <div className="flex flex-wrap gap-2">
          {BLOCOS.map((b) => (
            <button
              key={b}
              type="button"
              className={`chip ${bloco === b ? "chip-ativo" : ""}`}
              onClick={() => setBloco(b)}
            >
              {BLOCO_LABEL[b]}
            </button>
          ))}
        </div>
      )}
      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        Pra quem
        <select className="campo" value={para} onChange={(e) => setPara(e.target.value as Dono)}>
          <option value="Casa">A casa toda</option>
          {PESSOAS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="chip chip-ativo self-start"
        disabled={enviando || !titulo.trim()}
      >
        {enviando ? "Agendando…" : "Agendar"}
      </button>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import Agendar from "@/components/Agendar";
import CalendarioSemana from "@/components/CalendarioSemana";
import Pendencias from "@/components/Pendencias";
import Popup from "@/components/Popup";
import Tracker from "@/components/Tracker";
import { Rotulo } from "@/components/ui";
import { COR_BLOCO, ICONE_BLOCO, Marca } from "@/components/visual";
import { Filtro, Semana as IconeSemana } from "@/components/icones";
import { ehDe, estadoDa, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import {
  curta,
  diasDaSemana,
  inicioDaSemana,
  nomeDoDiaCurto,
  semanaISO,
} from "@/lib/datas";
import { alternarConclusao, useHoje, useZuppas } from "@/lib/store";
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

   Reorganizada em 24/07. O que mudou:

   - **Calendário no lugar do "anterior / próxima".** Chegar em setembro exigia
     sete cliques; agora se aponta o dedo num mês. Seleciona a semana inteira,
     não o dia, porque a unidade desta tela é a semana.
   - **Tracker de semanas.** A tabela de 7 dias que está vazia no vault desde
     16/06, viva e continuando depois da primeira semana. Corrente atual,
     recorde e oito semanas lado a lado.
   - **Filtros em popup.** Eram quinze pílulas empilhadas antes de qualquer
     conteúdo aparecer.
   - **Coluna do dia mais visual.** Cada bloco tem sua cor e seu ícone, os
     mesmos das outras telas, e o dia mostra progresso em vez de contagem crua. */

const CATEGORIAS: Categoria[] = [
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

  const [ancora, setAncora] = useState<string | null>(null);
  const [pessoa, setPessoa] = useState<Dono | "Todos">("Todos");
  const [categoria, setCategoria] = useState<Categoria | "Tudo">("Tudo");
  const [verTracker, setVerTracker] = useState(false);

  const referencia = ancora ?? hoje;
  const dias = useMemo(() => diasDaSemana(referencia), [referencia]);
  const ehSemanaAtual = inicioDaSemana(referencia) === inicioDaSemana(hoje);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

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
    (s, d) => s + d.lista.filter((o) => marcas.feitas.has(o.chave)).length,
    0
  );

  const pendencias = estado.pendencias.filter((p) => {
    if (p.status === "concluida") return false;
    if (categoria !== "Tudo" && categoria !== "pendencia") return false;
    if (pessoa === "Todos") return true;
    if (pessoa === "Casa") return false;
    return p.responsavel === pessoa;
  });

  const filtroAtivo = pessoa !== "Todos" || categoria !== "Tudo";

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1700px] lg:px-8 lg:pt-12">
        <header className="mb-5 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="tv-rotulo mb-1.5">
              Semana {semanaISO(referencia)}
              {ehSemanaAtual ? " · esta semana" : ""}
            </p>
            <h1
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {curta(dias[0])} a {curta(dias[6])}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {total} na semana · {feitas} {feitas === 1 ? "feita" : "feitas"}
            </p>
          </div>
        </header>

        {/* Controles */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Popup
            rotulo="Escolher semana"
            valor={ehSemanaAtual ? undefined : `${curta(dias[0])} a ${curta(dias[6])}`}
            icone={<IconeSemana className="h-3.5 w-3.5" />}
          >
            {(fechar) => (
              <CalendarioSemana
                selecionada={referencia}
                hoje={hoje}
                aoEscolher={(dia) => {
                  setAncora(dia);
                  fechar();
                }}
              />
            )}
          </Popup>

          <Popup
            rotulo="De quem"
            valor={pessoa === "Todos" ? undefined : String(pessoa)}
            icone={<Filtro className="h-3.5 w-3.5" />}
          >
            {(fechar) => (
              <div className="flex w-44 flex-col gap-1">
                {(["Todos", "Casa", ...PESSOAS] as (Dono | "Todos")[]).map((p) => (
                  <button
                    key={p}
                    className="item-popup"
                    style={{
                      background: p === pessoa ? "var(--accent)" : "transparent",
                      color: p === pessoa ? "var(--accent-foreground)" : "var(--ink)",
                    }}
                    onClick={() => {
                      setPessoa(p);
                      fechar();
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </Popup>

          <Popup
            rotulo="Tipo"
            valor={categoria === "Tudo" ? undefined : CATEGORIA_LABEL[categoria]}
          >
            {(fechar) => (
              <div className="flex w-52 flex-col gap-1">
                <button
                  className="item-popup"
                  style={{
                    background: categoria === "Tudo" ? "var(--accent)" : "transparent",
                    color:
                      categoria === "Tudo" ? "var(--accent-foreground)" : "var(--ink)",
                  }}
                  onClick={() => {
                    setCategoria("Tudo");
                    fechar();
                  }}
                >
                  Tudo
                </button>
                {[...CATEGORIAS, "pendencia" as Categoria].map((c) => (
                  <button
                    key={c}
                    className="item-popup flex items-center gap-2.5"
                    style={{
                      background: c === categoria ? "var(--accent)" : "transparent",
                      color: c === categoria ? "var(--accent-foreground)" : "var(--ink)",
                    }}
                    onClick={() => {
                      setCategoria(c);
                      fechar();
                    }}
                  >
                    <Marca categoria={c} tamanho={22} />
                    {CATEGORIA_LABEL[c]}
                  </button>
                ))}
              </div>
            )}
          </Popup>

          {filtroAtivo && (
            <button
              className="chip"
              onClick={() => {
                setPessoa("Todos");
                setCategoria("Tudo");
              }}
            >
              limpar filtros ×
            </button>
          )}

          <button
            className={`aba ml-auto ${verTracker ? "aba-ativa" : ""}`}
            onClick={() => setVerTracker((v) => !v)}
          >
            {verTracker ? "esconder progresso" : "ver progresso"}
          </button>
        </div>

        {verTracker && (
          <section className="mb-6">
            <Rotulo>Progresso das semanas</Rotulo>
            <Tracker hoje={hoje} itens={estado.itens} feitas={marcas.feitas} />
          </section>
        )}

        {/* Os 7 dias */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-7 lg:items-start lg:gap-3">
          {porDia.map(({ dia, lista }) => (
            <ColunaDoDia
              key={dia}
              dia={dia}
              hoje={hoje}
              ocorrencias={lista}
              marcas={marcas}
              aoAlternar={(o) => alternarConclusao(o.id, dia, estado.eu)}
            />
          ))}
        </div>

        <div className="mt-5">
          <Agendar data={dias[0] > hoje ? dias[0] : hoje} eu={estado.eu} />
        </div>

        <section className="mt-8">
          <Rotulo>Sem dia marcado ({pendencias.length})</Rotulo>
          <Pendencias
            pendencias={pendencias}
            hoje={hoje}
            vazio="Nada solto neste filtro."
          />
        </section>
      </div>
    </main>
  );
}

function ColunaDoDia({
  dia,
  hoje,
  ocorrencias,
  marcas,
  aoAlternar,
}: {
  dia: string;
  hoje: string;
  ocorrencias: Ocorrencia[];
  marcas: ReturnType<typeof indexar>;
  aoAlternar: (o: Ocorrencia) => void;
}) {
  const ehHoje = dia === hoje;
  const passou = dia < hoje;
  const feitas = ocorrencias.filter((o) => marcas.feitas.has(o.chave)).length;
  const abertas = ocorrencias.filter(
    (o) => estadoDa(o.chave, marcas) === "aberto"
  ).length;
  const fracao = ocorrencias.length === 0 ? 0 : feitas / ocorrencias.length;

  return (
    <section
      className={`glass-card overflow-hidden ${ehHoje ? "glass-card-strong" : ""}`}
      style={{
        borderColor: ehHoje ? "var(--accent)" : undefined,
        opacity: passou && abertas === 0 ? 0.55 : 1,
      }}
    >
      {/* Barra de progresso do dia, no topo do cartão */}
      <div style={{ height: 3, background: "var(--line)" }}>
        <div
          style={{
            height: "100%",
            width: `${fracao * 100}%`,
            background: "var(--accent)",
            transition: "width 0.25s ease",
          }}
        />
      </div>

      <div className="p-3.5">
        <header className="mb-2.5 flex items-baseline justify-between gap-2">
          <div>
            <p
              className="text-[0.68rem] uppercase tracking-widest"
              style={{ color: ehHoje ? "var(--accent)" : "var(--ink-soft)" }}
            >
              {nomeDoDiaCurto(dia)}
            </p>
            <p className="text-lg leading-tight" style={{ fontFamily: "var(--font-display)" }}>
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
            const Icone = ICONE_BLOCO[bloco];

            return (
              <div key={bloco} className="mb-2.5 last:mb-0">
                <p
                  className="mb-1 flex items-center gap-1 text-[0.6rem] uppercase tracking-widest"
                  style={{ color: COR_BLOCO[bloco] }}
                >
                  <Icone className="h-3 w-3" />
                  {BLOCO_LABEL[bloco]}
                </p>

                <ul className="flex flex-col gap-1">
                  {doBloco.map((o) => {
                    const est = estadoDa(o.chave, marcas);
                    return (
                      <li key={o.chave}>
                        <button
                          onClick={() => aoAlternar(o)}
                          className="flex w-full items-start gap-1.5 rounded-lg py-0.5 text-left"
                          aria-pressed={est === "feito"}
                          aria-label={`Marcar ${o.titulo} em ${curta(dia)}`}
                        >
                          <Marca categoria={o.categoria} tamanho={16} />
                          <span className="min-w-0 flex-1">
                            <span
                              className="block text-[0.78rem] leading-snug"
                              style={{
                                opacity: est === "aberto" ? 1 : 0.45,
                                textDecoration:
                                  est === "aberto" ? "none" : "line-through",
                              }}
                            >
                              {o.titulo}
                            </span>
                            <span
                              className="text-[0.62rem]"
                              style={{ color: "var(--ink-soft)" }}
                            >
                              {o.horario ? `${o.horario} · ` : ""}
                              {o.dono}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

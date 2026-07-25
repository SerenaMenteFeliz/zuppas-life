"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Agendar from "@/components/Agendar";
import CalendarioSemana from "@/components/CalendarioSemana";
import Pendencias from "@/components/Pendencias";
import Popup from "@/components/Popup";
import Tracker from "@/components/Tracker";
import { Rotulo } from "@/components/ui";
import { Marca } from "@/components/visual";
import { VisaoBlocos, VisaoColunas, VisaoLista } from "@/components/semana";
import { Filtro, Semana as IconeSemana } from "@/components/icones";
import Placar from "@/components/Placar";
import { ehComigo, ehDoMural, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import { curta, diasDaSemana, inicioDaSemana, semanaISO } from "@/lib/datas";
import { alternarConclusao, useHoje, useZuppas } from "@/lib/store";
import {
  CATEGORIA_LABEL,
  PESSOAS,
  type Categoria,
  type Dono,
  type Ocorrencia,
} from "@/lib/types";

/* A semana: tudo que tem que ser feito, de quem é, e em que dia.

   A mudança principal desta rodada é a **visão em blocos**, pedida depois de
   as faixas de manhã, tarde e noite funcionarem na tela de hoje: manhã, tarde
   e noite viram três linhas atravessando os sete dias. É a mesma estrutura do
   quadro branco que a [[Rotina - Família (Semana 1)]] descreve pra sala, e é a
   única visão que mostra a forma da semana, não só o conteúdo dela.

   As outras duas continuam porque servem a perguntas diferentes: colunas pra
   ver o detalhe de cada dia, lista pra ler no celular sem rolagem lateral. A
   escolha fica gravada, então ninguém precisa reescolher todo dia. */

const CATEGORIAS: Categoria[] = [
  "ancora",
  "biro",
  "casa",
  "escola",
  "compromisso",
  "lembrete",
  "pessoal",
];

type Visao = "blocos" | "colunas" | "lista";

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: "blocos", rotulo: "Blocos" },
  { valor: "colunas", rotulo: "Dias" },
  { valor: "lista", rotulo: "Lista" },
];

export default function Semana() {
  const estado = useZuppas();
  const hoje = useHoje();
  const router = useRouter();

  const [ancora, setAncora] = useState<string | null>(null);
  const [pessoa, setPessoa] = useState<Dono | "Todos">("Todos");
  const [categoria, setCategoria] = useState<Categoria | "Tudo">("Tudo");
  const [visao, setVisao] = useState<Visao>("blocos");
  const [verTracker, setVerTracker] = useState(false);

  const referencia = ancora ?? hoje;
  const dias = useMemo(() => diasDaSemana(referencia), [referencia]);
  const ehSemanaAtual = inicioDaSemana(referencia) === inicioDaSemana(hoje);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  /* O filtro por pessoa mudou de significado em 25/07, junto com o mural.

     Antes "Ge" queria dizer "o que está atribuído à Ge", e depois que quase
     nada tem dono isso responderia quase nada. Agora quer dizer "o que é dela
     por desenho, mais o que ela pegou ou fez": olhar a semana de alguém passou
     a ser olhar o que aquela pessoa realmente encostou, que é a pergunta certa
     numa casa que divide por mural. "Casa" isola o mural em si. */
  const porDia = useMemo(() => {
    return dias.map((dia) => {
      let lista = ocorrenciasDoDia(dia, estado.itens, estado.compromissos);
      if (pessoa !== "Todos") {
        lista =
          pessoa === "Casa"
            ? lista.filter(ehDoMural)
            : lista.filter((o) => ehComigo(o, pessoa, marcas));
      }
      if (categoria !== "Tudo") lista = lista.filter((o) => o.categoria === categoria);
      return { dia, lista };
    });
  }, [dias, estado.itens, estado.compromissos, pessoa, categoria, marcas]);

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

  const props = {
    dias,
    hoje,
    porDia,
    marcas,
    aoAlternar: (o: Ocorrencia, dia: string) =>
      alternarConclusao(o.id, dia, estado.eu),
    aoAbrirDia: (dia: string) => router.push(`/dia/${dia}`),
  };

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1700px] lg:px-8 lg:pt-12">
        <header className="mb-4">
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
        </header>

        {/* Visão */}
        <div className="mb-3 flex gap-1.5" role="tablist" aria-label="Formato da semana">
          {VISOES.map((v) => (
            <button
              key={v.valor}
              onClick={() => setVisao(v.valor)}
              className={`aba ${v.valor === visao ? "aba-ativa" : ""}`}
              role="tab"
              aria-selected={v.valor === visao}
            >
              {v.rotulo}
            </button>
          ))}
        </div>

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
          <div className="mb-6 flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start">
            <section>
              <Rotulo>Progresso das semanas</Rotulo>
              <Tracker
                hoje={hoje}
                itens={estado.itens}
                feitas={marcas.feitas}
                folgaSemanal={estado.preferencias.folgaSemanal}
              />
            </section>

            <section>
              <Rotulo>Divisão da casa</Rotulo>
              <Placar hoje={hoje} conclusoes={estado.conclusoes} />
            </section>
          </div>
        )}

        {visao === "blocos" && <VisaoBlocos {...props} />}
        {visao === "colunas" && <VisaoColunas {...props} />}
        {visao === "lista" && <VisaoLista {...props} />}

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

"use client";

import { useMemo, useState } from "react";
import Agendar from "@/components/Agendar";
import Linha from "@/components/Linha";
import Pendencias from "@/components/Pendencias";
import Popup from "@/components/Popup";
import { Rotulo } from "@/components/ui";
import { Anel, CabecalhoBloco } from "@/components/visual";
import { Filtro } from "@/components/icones";
import { corrente, ehDe, estadoDa, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import { horaDoDia, porExtenso } from "@/lib/datas";
import {
  alternarConclusao,
  definirPessoa,
  desagendar,
  pular,
  useHoje,
  useZuppas,
} from "@/lib/store";
import {
  BLOCOS,
  PESSOAS,
  blocoDaHora,
  type Bloco,
  type Ocorrencia,
} from "@/lib/types";

/* "Hoje, e é meu" — a superfície pessoal.

   Reorganizada em 24/07 depois do feedback do Yan. O que mudou e por quê:

   - **O dia é uma faixa por bloco, não uma aba escrita.** Manhã, tarde e noite
     ganharam cor, ícone e progresso próprios, e aparecem os três de uma vez.
     Filtrar por bloco continua existindo, mas virou o segundo toque: a primeira
     pergunta de quem abre é o dia inteiro.
   - **As fileiras de botão viraram dois popups.** Quem sou eu e o que estou
     vendo. Antes eram quinze pílulas empilhadas antes de qualquer conteúdo.
   - **Anel de progresso no topo.** Um número seco não diz se o dia está indo
     bem; o anel diz antes de alguém ler o número.
   - **Pendências agrupadas por projeto e recolhíveis**, porque 22 numa coluna
     única viram uma parede de texto que o olho pula. */

export default function Hoje() {
  const estado = useZuppas();
  const hoje = useHoje();

  const [bloco, setBloco] = useState<Bloco | "tudo">("tudo");
  const [soMeu, setSoMeu] = useState(true);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const ocorrencias = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  const doEscopo = useMemo(
    () => (soMeu ? ocorrencias.filter((o) => ehDe(o, estado.eu)) : ocorrencias),
    [ocorrencias, soMeu, estado.eu]
  );

  const visiveis = bloco === "tudo" ? doEscopo : doEscopo.filter((o) => o.bloco === bloco);

  const feitasNoEscopo = doEscopo.filter((o) => marcas.feitas.has(o.chave)).length;
  const abertasNoEscopo = doEscopo.filter(
    (o) => estadoDa(o.chave, marcas) === "aberto"
  ).length;

  const ancoras = ocorrencias.filter((o) => o.ancora);
  const ancorasFeitas = ancoras.filter((o) => marcas.feitas.has(o.chave)).length;
  const dias = useMemo(
    () => corrente(hoje, estado.itens, marcas.feitas),
    [hoje, estado.itens, marcas.feitas]
  );

  const blocoAgora = blocoDaHora(horaDoDia());
  const minhasPendencias = estado.pendencias.filter(
    (p) => p.status !== "concluida" && (!soMeu || p.responsavel === estado.eu)
  );
  const bloqueio = estado.pendencias.find(
    (p) => p.bloqueio && p.status !== "concluida"
  );

  const saudacao =
    horaDoDia() < 12 ? "Bom dia" : horaDoDia() < 18 ? "Boa tarde" : "Boa noite";

  function acoes(o: Ocorrencia) {
    return {
      estado: estadoDa(o.chave, marcas),
      aoMarcar: () => alternarConclusao(o.id, hoje, estado.eu),
      aoPular: () => pular(o.id, hoje, estado.eu),
      aoRemover: o.removivel ? () => desagendar(o.id) : undefined,
    };
  }

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1400px] lg:px-10 lg:pt-12">
        {/* Cabeçalho */}
        <header className="mb-6 flex items-start gap-4 lg:mb-9">
          <div className="min-w-0 flex-1">
            <p className="tv-rotulo mb-1.5">{porExtenso(hoje)}</p>
            <h1
              className="text-3xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {saudacao}, {estado.eu}.
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {abertasNoEscopo === 0
                ? "Nada em aberto agora."
                : `${abertasNoEscopo} em aberto`}
              {dias > 0 && ` · ${dias} ${dias === 1 ? "dia seguido" : "dias seguidos"}`}
            </p>
          </div>

          <Anel feitas={feitasNoEscopo} total={doEscopo.length} tamanho={68} />
        </header>

        {/* Controles: dois popups, e o filtro de bloco como atalho */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Popup rotulo="Quem sou eu" valor={estado.eu}>
            {(fechar) => (
              <div className="flex w-44 flex-col gap-1">
                {PESSOAS.map((p) => (
                  <ItemPopup
                    key={p}
                    ativo={p === estado.eu}
                    aoEscolher={() => {
                      definirPessoa(p);
                      fechar();
                    }}
                  >
                    {p}
                  </ItemPopup>
                ))}
              </div>
            )}
          </Popup>

          <Popup
            rotulo="O que ver"
            valor={soMeu ? "Só o que é meu" : "A casa toda"}
            icone={<Filtro className="h-3.5 w-3.5" />}
          >
            {(fechar) => (
              <div className="flex w-52 flex-col gap-1">
                <ItemPopup
                  ativo={soMeu}
                  aoEscolher={() => {
                    setSoMeu(true);
                    fechar();
                  }}
                >
                  Só o que é meu
                </ItemPopup>
                <ItemPopup
                  ativo={!soMeu}
                  aoEscolher={() => {
                    setSoMeu(false);
                    fechar();
                  }}
                >
                  A casa toda
                </ItemPopup>
              </div>
            )}
          </Popup>

          {bloco !== "tudo" && (
            <button className="aba aba-ativa" onClick={() => setBloco("tudo")}>
              ver o dia todo ×
            </button>
          )}

          <span
            className="ml-auto text-[0.7rem]"
            style={{ color: "var(--ink-soft)" }}
          >
            âncoras {ancorasFeitas}/{ancoras.length}
          </span>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-start lg:gap-9">
          {/* O dia, em faixas */}
          <div className="flex flex-col gap-7">
            {bloco === "tudo" ? (
              BLOCOS.map((b) => (
                <FaixaDoBloco
                  key={b}
                  bloco={b}
                  agora={b === blocoAgora}
                  ocorrencias={visiveis.filter((o) => o.bloco === b)}
                  marcas={marcas}
                  acoes={acoes}
                  aoFocar={() => setBloco(b)}
                />
              ))
            ) : (
              <FaixaDoBloco
                bloco={bloco}
                agora={bloco === blocoAgora}
                ocorrencias={visiveis}
                marcas={marcas}
                acoes={acoes}
              />
            )}

            <Agendar data={hoje} eu={estado.eu} />
          </div>

          {/* Coluna de contexto */}
          <aside className="mt-9 flex flex-col gap-6 lg:mt-0">
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

            <section>
              <Rotulo>
                {soMeu ? "Suas pendências" : "Pendências da casa"} (
                {minhasPendencias.length})
              </Rotulo>
              <Pendencias
                pendencias={minhasPendencias}
                hoje={hoje}
                vazio={soMeu ? "Nenhuma pendência sua." : "Nenhuma pendência aberta."}
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

/** Uma faixa do dia: manhã, tarde ou noite.

    A faixa do bloco atual ganha um contorno de acento. É a única pista de
    "onde estamos agora" que a tela dá, e ela some quando o dia vira. */
function FaixaDoBloco({
  bloco,
  ocorrencias,
  marcas,
  acoes,
  agora,
  aoFocar,
}: {
  bloco: Bloco;
  ocorrencias: Ocorrencia[];
  marcas: ReturnType<typeof indexar>;
  acoes: (o: Ocorrencia) => {
    estado: "feito" | "pulado" | "aberto";
    aoMarcar: () => void;
    aoPular: () => void;
    aoRemover?: () => void;
  };
  agora: boolean;
  aoFocar?: () => void;
}) {
  const feitas = ocorrencias.filter((o) => marcas.feitas.has(o.chave)).length;

  return (
    <section
      className="faixa-bloco"
      style={{
        borderColor: agora ? "var(--accent)" : "transparent",
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CabecalhoBloco bloco={bloco} feitas={feitas} total={ocorrencias.length} />
        </div>
        {aoFocar && ocorrencias.length > 0 && (
          <button
            onClick={aoFocar}
            className="mt-0.5 flex-none text-[0.68rem] underline underline-offset-4"
            style={{ color: "var(--ink-soft)" }}
          >
            só isto
          </button>
        )}
      </div>

      {ocorrencias.length === 0 ? (
        <p className="pl-1 text-sm" style={{ color: "var(--ink-soft)", opacity: 0.7 }}>
          Nada aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ocorrencias.map((o) => (
            <Linha key={o.chave} ocorrencia={o} {...acoes(o)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemPopup({
  children,
  ativo,
  aoEscolher,
}: {
  children: React.ReactNode;
  ativo: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      onClick={aoEscolher}
      className="item-popup"
      style={{
        background: ativo ? "var(--accent)" : "transparent",
        color: ativo ? "var(--accent-foreground)" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

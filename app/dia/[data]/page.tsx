"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Agendar from "@/components/Agendar";
import Linha from "@/components/Linha";
import { Vazio } from "@/components/ui";
import { Anel, CabecalhoBloco } from "@/components/visual";
import { Seta } from "@/components/icones";
import { estadoDa, indexar, ocorrenciasDoDia } from "@/lib/agenda";
import { porExtenso, somarDias } from "@/lib/datas";
import {
  alternarConclusao,
  desagendar,
  pular,
  useHoje,
  useZuppas,
} from "@/lib/store";
import { BLOCOS, type Bloco, type Ocorrencia } from "@/lib/types";

/* Um dia qualquer, aberto pela semana.

   A tela de hoje responde "o que eu faço agora". Esta responde "como é aquele
   dia", que é uma pergunta de planejamento: o domingo que vem, a segunda em que
   as aulas voltam, o sábado do mercado. É a camada de detalhe que a pesquisa de
   agenda recomenda ter atrás da visão de semana, em vez de espremer tudo dentro
   da célula de um calendário.

   Mesma estrutura de faixas do hoje, de propósito: quem aprendeu a ler uma
   aprende a outra de graça. */

function ehDataValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor));
}

export default function Dia() {
  const params = useParams<{ data: string }>();
  const router = useRouter();
  const estado = useZuppas();
  const hoje = useHoje();

  const data = typeof params.data === "string" ? params.data : "";
  const valida = ehDataValida(data);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);
  const ocorrencias = useMemo(
    () => (valida ? ocorrenciasDoDia(data, estado.itens, estado.compromissos) : []),
    [valida, data, estado.itens, estado.compromissos]
  );

  if (!valida) {
    return (
      <main className="veil-bg flex min-h-screen items-center justify-center px-6">
        <div className="glass-card max-w-sm p-7 text-center">
          <p className="mb-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            Essa data não existe.
          </p>
          <Link href="/semana" className="botao inline-block">
            Voltar pra semana
          </Link>
        </div>
      </main>
    );
  }

  const feitas = ocorrencias.filter((o) => marcas.feitas.has(o.chave)).length;
  const abertas = ocorrencias.filter((o) => estadoDa(o.chave, marcas) === "aberto");
  const ehHoje = data === hoje;

  function acoes(o: Ocorrencia) {
    return {
      estado: estadoDa(o.chave, marcas),
      aoMarcar: () => alternarConclusao(o.id, data, estado.eu),
      aoPular: () => pular(o.id, data, estado.eu),
      aoRemover: o.removivel ? () => desagendar(o.id) : undefined,
    };
  }

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-2xl px-5 pt-8 lg:pt-12">
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => router.push(`/dia/${somarDias(data, -1)}`)}
            className="chip"
            aria-label="Dia anterior"
          >
            <span className="inline-block rotate-180">
              <Seta className="h-3 w-3" />
            </span>
          </button>
          <Link href="/semana" className="chip">
            voltar pra semana
          </Link>
          <button
            onClick={() => router.push(`/dia/${somarDias(data, 1)}`)}
            className="chip"
            aria-label="Próximo dia"
          >
            <Seta className="h-3 w-3" />
          </button>
        </div>

        <header className="mb-7 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="tv-rotulo mb-1.5">
              {ehHoje ? "hoje" : data < hoje ? "já passou" : "ainda vem"}
            </p>
            <h1
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {porExtenso(data)}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {ocorrencias.length === 0
                ? "Dia livre."
                : `${abertas.length} em aberto de ${ocorrencias.length}`}
            </p>
          </div>
          {ocorrencias.length > 0 && (
            <Anel feitas={feitas} total={ocorrencias.length} tamanho={62} />
          )}
        </header>

        {ocorrencias.length === 0 ? (
          <Vazio>Nada previsto pra este dia. Dá pra agendar aqui embaixo.</Vazio>
        ) : (
          <div className="flex flex-col gap-7">
            {BLOCOS.map((bloco) => (
              <FaixaDoDia
                key={bloco}
                bloco={bloco}
                ocorrencias={ocorrencias.filter((o) => o.bloco === bloco)}
                marcas={marcas}
                acoes={acoes}
              />
            ))}
          </div>
        )}

        <div className="mt-7">
          <Agendar data={data} eu={estado.eu} />
        </div>
      </div>
    </main>
  );
}

function FaixaDoDia({
  bloco,
  ocorrencias,
  marcas,
  acoes,
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
}) {
  if (ocorrencias.length === 0) return null;
  const feitas = ocorrencias.filter((o) => marcas.feitas.has(o.chave)).length;

  return (
    <section className="faixa-bloco" style={{ borderColor: "transparent" }}>
      <CabecalhoBloco bloco={bloco} feitas={feitas} total={ocorrencias.length} />
      <ul className="flex flex-col gap-2">
        {ocorrencias.map((o) => (
          <Linha key={o.chave} ocorrencia={o} {...acoes(o)} />
        ))}
      </ul>
    </section>
  );
}

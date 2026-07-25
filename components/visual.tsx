"use client";

import {
  Ancora,
  Cachorro,
  Coracao,
  Manha,
  Mochila,
  Noite,
  Pasta,
  Sino,
  Tarde,
  Vassoura,
  Semana as IconeAgenda,
} from "./icones";
import { BLOCO_JANELA, BLOCO_LABEL, type Bloco, type Categoria } from "@/lib/types";

/* Vocabulário visual: cor e forma por tipo de coisa.

   O pedido do Yan foi "fácil de entender o que é cada coisa" e "manhã, tarde e
   noite mais visual". As duas coisas se resolvem no mesmo lugar: cada categoria
   e cada bloco do dia ganham forma e cor próprias, que se repetem em todas as
   telas. Depois de dois dias de uso, ninguém lê o rótulo, só reconhece.

   As cores saem todas de tokens que já existem no tema. Nenhuma cor nova. */

export const COR_CATEGORIA: Record<Categoria, string> = {
  ancora: "var(--gold)",
  biro: "var(--sage)",
  casa: "var(--accent)",
  escola: "var(--sky)",
  pessoal: "var(--sage)",
  compromisso: "var(--terracotta)",
  lembrete: "var(--gold)",
  pendencia: "var(--ink-soft)",
};

const ICONE_CATEGORIA: Record<Categoria, (p: { className?: string }) => React.ReactElement> = {
  ancora: Ancora,
  biro: Cachorro,
  casa: Vassoura,
  escola: Mochila,
  pessoal: Coracao,
  compromisso: IconeAgenda,
  lembrete: Sino,
  pendencia: Pasta,
};

/** Marca da categoria: um quadradinho colorido com o ícone dentro. */
export function Marca({
  categoria,
  tamanho = 30,
}: {
  categoria: Categoria;
  tamanho?: number;
}) {
  const Icone = ICONE_CATEGORIA[categoria];
  const cor = COR_CATEGORIA[categoria];

  /* Fundo e ícone em camadas separadas de propósito: o fundo precisa da cor
     esmaecida e o ícone da cor cheia. Fazer isso com `opacity` no pai apagaria
     os dois juntos, e `color-mix` está fora por causa do navegador da TV. */
  return (
    <span
      className="relative flex flex-none items-center justify-center overflow-hidden rounded-[10px]"
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="absolute inset-0"
        style={{ background: cor, opacity: 0.15 }}
        aria-hidden="true"
      />
      <span
        className="relative flex items-center justify-center"
        style={{ color: cor, width: tamanho * 0.56, height: tamanho * 0.56 }}
      >
        <Icone className="h-full w-full" />
      </span>
    </span>
  );
}

export const ICONE_BLOCO: Record<Bloco, (p: { className?: string }) => React.ReactElement> = {
  manha: Manha,
  tarde: Tarde,
  noite: Noite,
};

export const COR_BLOCO: Record<Bloco, string> = {
  manha: "var(--gold)",
  tarde: "var(--sky)",
  noite: "var(--accent)",
};

/** Cabeçalho de um bloco do dia.

    É o que transforma a aba escrita numa faixa que se reconhece de longe: cor
    própria, ícone próprio, a janela de horas escrita ao lado (porque a rotina
    da casa é janela, não horário), e o progresso do bloco à direita. */
export function CabecalhoBloco({
  bloco,
  feitas,
  total,
}: {
  bloco: Bloco;
  feitas: number;
  total: number;
}) {
  const Icone = ICONE_BLOCO[bloco];
  const cor = COR_BLOCO[bloco];
  const completo = total > 0 && feitas === total;

  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
        style={{ background: cor, color: "var(--bg)" }}
      >
        <Icone className="h-[18px] w-[18px]" />
      </span>

      <span className="flex flex-col leading-tight">
        <span className="text-[0.95rem]">{BLOCO_LABEL[bloco]}</span>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-soft)" }}>
          {BLOCO_JANELA[bloco]}
        </span>
      </span>

      <span
        className="ml-auto text-[0.72rem]"
        style={{ color: completo ? cor : "var(--ink-soft)" }}
      >
        {total === 0 ? "livre" : completo ? "tudo feito" : `${feitas}/${total}`}
      </span>
    </div>
  );
}

/** Anel de progresso do dia. Um número seco não diz se o dia está indo bem;
    o anel diz antes de alguém ler o número. */
export function Anel({
  feitas,
  total,
  tamanho = 62,
}: {
  feitas: number;
  total: number;
  tamanho?: number;
}) {
  const fracao = total === 0 ? 0 : feitas / total;
  const raio = tamanho / 2 - 4;
  const volta = 2 * Math.PI * raio;

  return (
    <span className="relative flex flex-none items-center justify-center">
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="var(--line)"
          strokeWidth="4"
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - fracao)}
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
      </svg>
      <span
        className="absolute text-[0.78rem]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {feitas}/{total}
      </span>
    </span>
  );
}

"use client";

import { useState } from "react";
import { haQuantoTempo, diasEntre, quandoFalta } from "@/lib/datas";
import { linkDoVault } from "@/lib/dados";
import { mudarStatusPendencia } from "@/lib/store";
import { Avatar } from "./ui";
import { Check, Seta } from "./icones";
import type { Pendencia } from "@/lib/types";

/* Pendências, agrupadas e compactas.

   O problema apontado em 24/07 era real: 22 pendências numa coluna única viram
   uma parede de texto, e o olho desiste antes da terceira. A correção é a
   mesma que a pesquisa de painel familiar recomenda pra tudo, "fazer menos e
   mais claro":

   - **Agrupadas por projeto**, com contagem, e recolhíveis. Quem abre quer
     saber quantas coisas o Lar Interior tem parado, não ler as dez.
   - **Uma linha por pendência**, não um cartão. Detalhe abre no toque.
   - **Idade vira cor**, não texto extra. Quem passou de um mês fica em
     terracota, e a lista se lê pelo padrão de cor antes das palavras.

   Grupos com item parado há mais tempo vêm primeiro: se a ordem fosse
   alfabética, a coisa mais esquecida da casa ficaria no fim. */

export default function Pendencias({
  pendencias,
  hoje,
  vazio = "Nenhuma pendência.",
}: {
  pendencias: Pendencia[];
  hoje: string;
  vazio?: string;
}) {
  const grupos = new Map<string, Pendencia[]>();
  for (const p of pendencias) {
    const lista = grupos.get(p.projeto) ?? [];
    lista.push(p);
    grupos.set(p.projeto, lista);
  }

  const ordenados = [...grupos.entries()].sort((a, b) => {
    const maisVelhaA = a[1].reduce((v, p) => (p.atualizado < v ? p.atualizado : v), "9999");
    const maisVelhaB = b[1].reduce((v, p) => (p.atualizado < v ? p.atualizado : v), "9999");
    return maisVelhaA.localeCompare(maisVelhaB);
  });

  if (pendencias.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {vazio}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {ordenados.map(([projeto, itens]) => (
        <Grupo key={projeto} projeto={projeto} itens={itens} hoje={hoje} />
      ))}
    </div>
  );
}

function Grupo({
  projeto,
  itens,
  hoje,
}: {
  projeto: string;
  itens: Pendencia[];
  hoje: string;
}) {
  const [aberto, setAberto] = useState(true);

  const maisVelha = itens.reduce((v, p) => (p.atualizado < v ? p.atualizado : v), "9999");
  const dias = diasEntre(maisVelha, hoje);
  const travadas = itens.filter((p) => p.status === "bloqueada").length;

  return (
    <section className="glass-card overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
        aria-expanded={aberto}
      >
        <span
          className="flex-none transition-transform"
          style={{ transform: aberto ? "rotate(90deg)" : "none" }}
        >
          <Seta className="h-3.5 w-3.5" />
        </span>
        <span
          className="text-[0.72rem] uppercase tracking-widest"
          style={{ color: "var(--ink-soft)" }}
        >
          {projeto}
        </span>

        <span
          className="ml-auto flex items-center gap-2 text-[0.68rem]"
          style={{ color: dias > 30 ? "var(--terracotta)" : "var(--ink-soft)" }}
        >
          {travadas > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5"
              style={{ background: "var(--terracotta)", color: "#fff" }}
            >
              {travadas} travada{travadas > 1 ? "s" : ""}
            </span>
          )}
          <span>{itens.length}</span>
          <span>· mais velha {haQuantoTempo(maisVelha, hoje)}</span>
        </span>
      </button>

      {aberto && (
        <ul
          className="flex flex-col border-t"
          style={{ borderColor: "var(--line)" }}
        >
          {[...itens]
            .sort((a, b) => a.atualizado.localeCompare(b.atualizado))
            .map((p) => (
              <LinhaPendencia key={p.id} pendencia={p} hoje={hoje} />
            ))}
        </ul>
      )}
    </section>
  );
}

function LinhaPendencia({ pendencia, hoje }: { pendencia: Pendencia; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const p = pendencia;
  const dias = diasEntre(p.atualizado, hoje);

  const cor =
    dias > 30 ? "var(--terracotta)" : dias > 13 ? "var(--gold)" : "var(--ink-soft)";

  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--line)" }}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
      >
        <span
          className="h-1.5 w-1.5 flex-none rounded-full"
          style={{ background: cor }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-[0.9rem]">{p.titulo}</span>
        {p.prazo && (
          <span className="flex-none text-[0.65rem]" style={{ color: "var(--gold)" }}>
            {quandoFalta(p.prazo, hoje)}
          </span>
        )}
        <span className="flex-none text-[0.65rem]" style={{ color: cor }}>
          {haQuantoTempo(p.atualizado, hoje)}
        </span>
        <Avatar dono={p.responsavel} tamanho={20} />
      </button>

      {aberto && (
        <div className="flex flex-col gap-2.5 px-4 pb-3.5 pl-9">
          {p.nota && (
            <p className="text-[0.8rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
              {p.nota}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => mudarStatusPendencia(p.id, "concluida")}
              className="chip flex items-center gap-1.5"
            >
              <Check className="h-3 w-3" />
              Concluir
            </button>
            {p.status !== "em-andamento" && (
              <button
                onClick={() => mudarStatusPendencia(p.id, "em-andamento")}
                className="chip"
              >
                Comecei
              </button>
            )}
            {p.status !== "bloqueada" && (
              <button
                onClick={() => mudarStatusPendencia(p.id, "bloqueada")}
                className="chip"
              >
                Travou
              </button>
            )}
            {p.vaultNota && (
              <a
                href={linkDoVault(p.vaultNota)}
                className="chip"
                style={{ textDecoration: "none" }}
              >
                abrir no vault
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

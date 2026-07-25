"use client";

import { useMemo } from "react";
import { placar } from "@/lib/agenda";
import { COR_PESSOA, INICIAL, PESSOAS, type Conclusao } from "@/lib/types";

/* Quem fez quanta coisa nos últimos sete dias.

   Este componente é a condição de existir do mural. Em 25/07 a casa tirou o
   nome de quase toda tarefa: nada mais é "da Liz" ou "do Yan", tudo fica aberto
   e quem marcar pegou aquela. Isso resolve a rigidez de uma escala que não cabe
   na semana real, e cria um risco óbvio no lugar: sem "é sua vez", quem já
   puxava continua puxando e agora ninguém consegue nem apontar.

   O contrapeso é este: a contagem fica visível. Sem ponto, sem prêmio, sem
   vencedor, sem meta por pessoa. Só o que aconteceu. Se a semana ficou torta, a
   barra fica torta, e a conversa acontece entre as pessoas.

   Modo calmo esconde este bloco junto com o resto do que não é essencial. */

export default function Placar({
  hoje,
  conclusoes,
  titulo = "Quem fez o quê, últimos 7 dias",
}: {
  hoje: string;
  conclusoes: Conclusao[];
  titulo?: string;
}) {
  const linhas = useMemo(
    () => placar(hoje, conclusoes, PESSOAS),
    [hoje, conclusoes]
  );

  const teto = Math.max(1, ...linhas.map((l) => l.feitas));
  const total = linhas.reduce((s, l) => s + l.feitas, 0);

  return (
    <div className="glass-card p-4">
      <p className="mb-3 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
        {titulo}
      </p>

      {total === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-soft)", opacity: 0.75 }}>
          Ninguém marcou nada ainda nesta semana.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => (
            <li key={l.pessoa} className="flex items-center gap-2.5">
              <span
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[0.68rem] font-semibold"
                style={{
                  background: l.feitas > 0 ? COR_PESSOA[l.pessoa] : "var(--glass)",
                  color: l.feitas > 0 ? "var(--bg)" : "var(--ink-soft)",
                  border: l.feitas > 0 ? "none" : "1px solid var(--line)",
                }}
              >
                {INICIAL[l.pessoa]}
              </span>

              <span className="w-16 flex-none text-[0.82rem]">{l.pessoa}</span>

              <span
                className="h-2 flex-1 overflow-hidden rounded-full"
                style={{ background: "var(--line)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(l.feitas / teto) * 100}%`,
                    background: COR_PESSOA[l.pessoa],
                    transition: "width 0.3s ease",
                  }}
                />
              </span>

              <span
                className="w-14 flex-none text-right text-[0.72rem]"
                style={{ color: "var(--ink-soft)" }}
              >
                {l.feitas}
                {l.pegas > 0 && ` +${l.pegas}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[0.66rem]" style={{ color: "var(--ink-soft)", opacity: 0.8 }}>
        Contagem do que foi marcado, não avaliação. O número depois do + é o que
        a pessoa pegou e ainda não terminou.
      </p>
    </div>
  );
}

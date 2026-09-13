"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OpcaoVariante } from "@/lib/quiz-variantes";

/* Toggle de variante do quiz (12/09/2026, pedido do Yan). Mesmo padrão do
   FiltroData: o valor vive na URL (`?variante=`), convive com `?de=&ate=` e o
   link compartilhado abre na mesma variante. A variante padrão (a primeira
   ativa) não vai pra URL, pra o link continuar curto.

   As opções vêm de `quiz/variantes.json` do site do quiz. Variante nova
   aparece aqui sozinha assim que o deploy de lá fica pronto. */
export default function FiltroVariante({
  opcoes,
  atual,
  padrao,
}: {
  opcoes: OpcaoVariante[];
  atual: string;
  padrao: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function escolher(id: string) {
    const novo = new URLSearchParams(searchParams.toString());
    if (id === padrao) novo.delete("variante");
    else novo.set("variante", id);
    const query = novo.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Variante do quiz">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`painel-badge${o.id === atual ? " painel-badge-escolhido" : ""}`}
          aria-pressed={o.id === atual}
          title={o.descricao}
          onClick={() => escolher(o.id)}
        >
          {o.nome}
          <span className="funil-variante-status">{o.rotuloStatus}</span>
        </button>
      ))}
    </div>
  );
}

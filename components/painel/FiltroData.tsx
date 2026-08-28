"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CampoData from "@/components/painel/CampoData";

/* Filtro de período pro painel de funis (28/08/2026, pedido do Yan: "zuppas
   life ainda não tem filtro por data"). Mesmo padrão do FiltroPerfil: o valor
   vive na URL (`?de=&ate=`), então voltar e compartilhar o link continuam
   funcionando. Sem `de`/`ate`, toda consulta cai no padrão de sempre (90
   dias) — ver `faixaPostHog`/`faixaHogQL` em `lib/painel-funis.ts`. */
export default function FiltroData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";

  function atualizar(chave: "de" | "ate", valor: string) {
    const novo = new URLSearchParams(searchParams.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    const query = novo.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <CampoData valor={de} aoMudar={(v) => atualizar("de", v)} rotuloAcessivel="Período: de" vazio="De" />
      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
        até
      </span>
      <CampoData valor={ate} aoMudar={(v) => atualizar("ate", v)} rotuloAcessivel="Período: até" vazio="Até" />
      {(de || ate) && (
        <button
          type="button"
          className="conteudo-mini"
          onClick={() => router.push(pathname)}
        >
          Últimos 90 dias
        </button>
      )}
    </div>
  );
}

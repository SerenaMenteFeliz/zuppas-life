"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CampoData from "@/components/painel/CampoData";
import { hojeISO, somarDias } from "@/lib/datas";

/* Filtro de período pro painel de funis (28/08/2026, pedido do Yan: "zuppas
   life ainda não tem filtro por data"). Mesmo padrão do FiltroPerfil: o valor
   vive na URL (`?de=&ate=`), então voltar e compartilhar o link continuam
   funcionando. Sem `de`/`ate`, toda consulta cai no padrão de 90 dias — ver
   `faixaPostHog`/`faixaHogQL`/`faixaSupabaseQS` em `lib/painel-funis.ts`.

   Atalhos de 7/30/90 dias desde 11/09/2026. Antes, sem filtro, os dois campos
   ficavam vazios e a tela não dizia em lugar nenhum qual período mostrava; o
   botão "Últimos 90 dias" só aparecia depois de filtrar, como "limpar". Agora o
   padrão aparece aceso, e é a primeira coisa que se lê no topo. */
const ATALHOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

export default function FiltroData() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";
  const hoje = hojeISO();

  function ir(novo: URLSearchParams) {
    const query = novo.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function atualizar(chave: "de" | "ate", valor: string) {
    const novo = new URLSearchParams(searchParams.toString());
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    ir(novo);
  }

  function aplicarAtalho(dias: number) {
    const novo = new URLSearchParams(searchParams.toString());
    novo.delete("ate");
    // 90 é o padrão: sem parâmetro, a URL fica limpa e o link continua curto.
    if (dias === 90) novo.delete("de");
    else novo.set("de", somarDias(hoje, -(dias - 1)));
    ir(novo);
  }

  function atalhoAtivo(dias: number) {
    if (ate) return false;
    return dias === 90 ? !de : de === somarDias(hoje, -(dias - 1));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1" role="group" aria-label="Período">
        {ATALHOS.map((a) => (
          <button
            key={a.dias}
            type="button"
            className={`painel-badge${atalhoAtivo(a.dias) ? " painel-badge-escolhido" : ""}`}
            aria-pressed={atalhoAtivo(a.dias)}
            onClick={() => aplicarAtalho(a.dias)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <CampoData valor={de} aoMudar={(v) => atualizar("de", v)} rotuloAcessivel="Período: de" vazio="De" />
      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
        até
      </span>
      <CampoData valor={ate} aoMudar={(v) => atualizar("ate", v)} rotuloAcessivel="Período: até" vazio="Até" />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Vazio } from "@/components/ui";
import FichaContato from "@/components/painel/FichaContato";
import { OFERTA_COR, OFERTA_ROTULO, type Oferta, type Pessoa } from "@/lib/painel-contatos";

/* Lista da aba Contatos (28/08/2026, refeita em 01/09/2026).

   Client component por causa da busca, do filtro e da ficha. Os dados chegam
   prontos do Server Component pai, mesmo padrão do Funil.tsx.

   A LINHA ABRE UMA FICHA EM POPUP, não expande mais no lugar. O motivo está
   escrito em FichaContato.tsx; o resumo é que a pessoa tem mais dado do que
   cabe numa linha, e ação destrutiva não pode morar a um clique do gesto mais
   comum da tela.

   Os chips deixaram de ser "de qual tabela veio" e passaram a ser AS OFERTAS.
   A pergunta que alguém faz olhando esta lista é "essa pessoa é do Cálice ou
   da Biblioteca", nunca "essa pessoa veio de lead_events". */

function data(iso: string | null) {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dinheiro(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

const OFERTAS: Oferta[] = ["quiz", "calice", "lar", "biblioteca"];

export default function ListaContatos({ pessoas }: { pessoas: Pessoa[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Oferta | "todas">("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter((p) => {
      if (filtro !== "todas" && !p.ofertas.includes(filtro)) return false;
      if (!q) return true;
      return (
        p.email.toLowerCase().includes(q) ||
        (p.nome ?? "").toLowerCase().includes(q) ||
        (p.whatsapp ?? "").toLowerCase().includes(q) ||
        (p.origem ?? "").toLowerCase().includes(q)
      );
    });
  }, [pessoas, busca, filtro]);

  /* A ficha procura em `pessoas`, não em `visiveis`: assim ela sobrevive a uma
     troca de filtro feita por engano com a ficha aberta. E some sozinha quando
     a pessoa deixa de existir, que é o que acontece logo depois de apagar. */
  const pessoaAberta = aberta ? pessoas.find((p) => p.chave === aberta) : undefined;

  if (pessoas.length === 0) {
    return <Vazio>Nenhuma pessoa no banco ainda.</Vazio>;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail, WhatsApp ou origem"
          className="min-w-[240px] flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: "rgba(120,110,160,.10)",
            color: "var(--ink)",
            border: "1px solid rgba(120,110,160,.18)",
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          {(["todas", ...OFERTAS] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className="rounded-full px-3 py-1.5 text-[0.7rem] transition-colors"
              style={
                filtro === f
                  ? { background: "#4b2e83", color: "#fff" }
                  : { background: "rgba(120,110,160,.13)", color: "var(--ink-soft)" }
              }
            >
              {f === "todas" ? "Todas" : OFERTA_ROTULO[f]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
        {visiveis.length} de {pessoas.length} {pessoas.length === 1 ? "pessoa" : "pessoas"}
      </p>

      {visiveis.length === 0 ? (
        <Vazio>Nada casa com esse filtro.</Vazio>
      ) : (
        <div className="glass-card divide-y" style={{ borderColor: "rgba(120,110,160,.14)" }}>
          {visiveis.map((p) => (
            <button
              key={p.chave}
              type="button"
              onClick={() => setAberta(p.chave)}
              aria-haspopup="dialog"
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {p.nome ?? p.email}
                </p>
                <p className="truncate text-[0.72rem]" style={{ color: "var(--ink-soft)" }}>
                  {p.email}
                  {p.whatsapp ? ` · ${p.whatsapp}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {p.ofertas.map((o) => (
                  <span
                    key={o}
                    className="rounded-full px-2 py-0.5 text-[0.62rem]"
                    style={{ background: OFERTA_COR[o], color: "var(--ink)" }}
                  >
                    {OFERTA_ROTULO[o]}
                  </span>
                ))}
              </div>

              <div className="w-[92px] text-right">
                <p className="text-[0.72rem]" style={{ color: "var(--ink)" }}>
                  {p.gastoCentavos > 0 ? dinheiro(p.gastoCentavos) : "nunca comprou"}
                </p>
                <p className="text-[0.66rem]" style={{ color: "var(--ink-soft)" }}>
                  {data(p.ultimaAtividade)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {pessoaAberta && <FichaContato pessoa={pessoaAberta} fechar={() => setAberta(null)} />}
    </>
  );
}

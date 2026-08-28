"use client";

import { useMemo, useState } from "react";
import { Vazio } from "@/components/ui";
import type { FonteContato, Pessoa } from "@/lib/painel-contatos";

/* Lista da aba Contatos (28/08/2026).

   Client component só por causa da busca e do abrir/fechar da linha. Os dados
   chegam prontos do Server Component pai, mesmo padrão do Funil.tsx.

   A LINHA ABRE em vez de levar pra outra tela. Não existe ficha de contato
   pra ir, e criar uma rota /painel/contatos/[id] hoje seria inventar uma
   chave: quem vem da Biblioteca não tem `contact_id` nenhum, só e-mail. */

const FONTE_ROTULO: Record<FonteContato, string> = {
  quiz: "Quiz",
  biblioteca: "Biblioteca",
  acesso: "Acesso pago",
};

const FONTE_COR: Record<FonteContato, string> = {
  quiz: "rgba(120,110,190,.20)",
  biblioteca: "rgba(75,46,131,.34)",
  acesso: "rgba(90,150,120,.24)",
};

function data(iso: string | null) {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dinheiro(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

export default function ListaContatos({ pessoas }: { pessoas: Pessoa[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FonteContato | "todas">("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter((p) => {
      if (filtro !== "todas" && !p.fontes.includes(filtro)) return false;
      if (!q) return true;
      return (
        p.email.toLowerCase().includes(q) ||
        (p.nome ?? "").toLowerCase().includes(q) ||
        (p.origem ?? "").toLowerCase().includes(q)
      );
    });
  }, [pessoas, busca, filtro]);

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
          placeholder="Buscar por nome, e-mail ou origem"
          className="min-w-[240px] flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            background: "rgba(120,110,160,.10)",
            color: "var(--ink)",
            border: "1px solid rgba(120,110,160,.18)",
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          {(["todas", "quiz", "biblioteca", "acesso"] as const).map((f) => (
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
              {f === "todas" ? "Todas" : FONTE_ROTULO[f]}
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
          {visiveis.map((p) => {
            const abertaAgora = aberta === p.chave;
            return (
              <div key={p.chave} style={{ borderColor: "rgba(120,110,160,.14)" }}>
                <button
                  type="button"
                  onClick={() => setAberta(abertaAgora ? null : p.chave)}
                  aria-expanded={abertaAgora}
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
                    {p.fontes.map((f) => (
                      <span
                        key={f}
                        className="rounded-full px-2 py-0.5 text-[0.62rem]"
                        style={{ background: FONTE_COR[f], color: "var(--ink)" }}
                      >
                        {FONTE_ROTULO[f]}
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

                {abertaAgora && (
                  <div className="px-4 pb-4 pt-0">
                    <dl
                      className="mb-3 grid gap-x-6 gap-y-1 text-[0.72rem] sm:grid-cols-2"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      <div>
                        <dt className="inline">Primeiro contato: </dt>
                        <dd className="inline" style={{ color: "var(--ink)" }}>
                          {data(p.primeiroContato)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Origem: </dt>
                        <dd className="inline" style={{ color: "var(--ink)" }}>
                          {p.origem ?? "não registrada"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Pedidos pagos: </dt>
                        <dd className="inline" style={{ color: "var(--ink)" }}>
                          {p.pedidosPagos}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Produtos com acesso: </dt>
                        <dd className="inline" style={{ color: "var(--ink)" }}>
                          {p.produtos.length > 0 ? p.produtos.join(", ") : "nenhum"}
                        </dd>
                      </div>
                    </dl>

                    <ol className="space-y-1.5">
                      {p.eventos.map((ev, i) => (
                        <li key={i} className="flex gap-2.5 text-[0.72rem]">
                          <span
                            className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: FONTE_COR[ev.fonte] }}
                          />
                          <span style={{ color: "var(--ink-soft)" }}>{data(ev.quando)}</span>
                          <span style={{ color: "var(--ink)" }}>{ev.rotulo}</span>
                          {ev.detalhe && <span style={{ color: "var(--ink-soft)" }}>{ev.detalhe}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

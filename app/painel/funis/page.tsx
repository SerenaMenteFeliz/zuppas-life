import Link from "next/link";
import PainelTopo from "@/components/painel/PainelTopo";
import { Rotulo, Vazio } from "@/components/ui";
import { FUNIS, carregarResumoProdutos } from "@/lib/painel-funis";

/* Lista de funis — porta de entrada do painel (05/08, antes disso era uma
   página só com tudo empilhado). Cada linha é um funil (FUNIS em
   lib/painel-funis.ts), clicar leva pro detalhe em /painel/funis/[id], que
   tem o preview ao vivo + o carrossel de etapas que viviam soltos aqui. */

export const dynamic = "force-dynamic";

export default async function FunisPage() {
  const resumos = await carregarResumoProdutos();
  const semDados = resumos.every((r) => r.totalLeads === 0);

  return (
    <>
      <PainelTopo titulo="Funis" largura={1200} />

      <div className="mx-auto w-full max-w-[1200px]">
      {semDados ? (
        <Vazio>
          Sem dado ainda — confere se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY estão
          setadas nesse projeto (Vercel → zuppas-life → env vars).
        </Vazio>
      ) : (
        <section>
          <Rotulo>Todos os funis</Rotulo>
          <div className="flex flex-col gap-3">
            {FUNIS.map((f) => {
              const resumo = resumos.find((r) => r.produtoSlug === f.produtoSlug);
              return (
                <Link
                  key={f.id}
                  href={`/painel/funis/${f.id}`}
                  className="glass-card painel-card-clicavel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="painel-badge">{f.tipo}</span>
                    <div>
                      <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        {f.produto}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                        {f.urlPublica.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <MetricaInline rotulo="Leads" valor={resumo?.totalLeads ?? 0} />
                    <MetricaInline rotulo="Compras" valor={resumo?.totalCompras ?? 0} />
                    <MetricaInline rotulo="Conversão" valor={`${(resumo?.conversao ?? 0).toFixed(1)}%`} />
                    <span aria-hidden style={{ color: "var(--ink-soft)" }}>
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      </div>
    </>
  );
}

function MetricaInline({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="text-right">
      <p className="text-[0.62rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {valor}
      </p>
    </div>
  );
}

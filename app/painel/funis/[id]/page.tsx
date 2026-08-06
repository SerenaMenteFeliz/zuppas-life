import Link from "next/link";
import { notFound } from "next/navigation";
import { Rotulo } from "@/components/ui";
import { FunilEtapas } from "@/components/painel/Funil";
import { FunilPreview } from "@/components/painel/FunilPreview";
import { FUNIS, carregarDetalheFunil, consultarFunilPostHog } from "@/lib/painel-funis";

/* Detalhe de um funil (05/08): header com voltar/labels/link pro funil de
   verdade, preview ao vivo grande em cima, carrossel de etapas embaixo
   como seletor — ver FunilPreview.tsx. Método Cálice ganha uma faixa extra
   ("visão geral") acima do preview, porque é o único funil com um resumo
   de aquisição→compra que não é "etapa do quiz" (mistura evento de site
   com evento de compra no serena-app). */

export const dynamic = "force-dynamic";

export default async function FunilDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = FUNIS.find((f) => f.id === id);
  if (!meta) notFound();

  const [detalhe, visaoGeral] = await Promise.all([
    carregarDetalheFunil(id),
    meta.produtoSlug === "metodo-calice"
      ? consultarFunilPostHog(["quiz_started", "quiz_completed", "lead_submitted", "purchase"])
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/painel/funis" className="text-xs" style={{ color: "var(--ink-soft)" }}>
            ‹ Todos os funis
          </Link>
          <div className="mt-1.5 flex items-center gap-2.5">
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
              {meta.produto}
            </h1>
            <span className="painel-badge">{meta.tipo}</span>
          </div>
        </div>
        <a
          href={meta.urlPublica}
          target="_blank"
          rel="noreferrer"
          className="glass-card px-4 py-2.5 text-sm font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Abrir funil ↗
        </a>
      </header>

      {visaoGeral && (
        <section className="mb-8">
          <Rotulo>Visão geral — quiz → lead → compra</Rotulo>
          <FunilEtapas etapas={visaoGeral} vazio="Sem evento suficiente ainda pra montar esse funil." />
        </section>
      )}

      <section>
        <Rotulo>Preview ao vivo</Rotulo>
        <FunilPreview
          etapas={detalhe.etapas}
          previewUrls={detalhe.previewUrls}
          urlInicial={meta.urlPublica}
          vazio={detalhe.vazio}
        />
      </section>
    </div>
  );
}

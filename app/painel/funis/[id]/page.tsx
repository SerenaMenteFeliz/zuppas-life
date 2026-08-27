import { notFound } from "next/navigation";
import { Rotulo } from "@/components/ui";
import { FunilEtapas } from "@/components/painel/Funil";
import { FunilPreview } from "@/components/painel/FunilPreview";
import PainelTopo from "@/components/painel/PainelTopo";
import {
  FUNIS,
  carregarDetalheFunil,
  consultarFunilPostHog,
  consultarFunilBiblioteca,
  carregarLivrosBiblioteca,
  carregarVendasBiblioteca,
} from "@/lib/painel-funis";

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

  const ehBiblioteca = meta.produtoSlug === "biblioteca-oculta";

  const [detalhe, visaoGeral, biblioteca, vendas] = await Promise.all([
    carregarDetalheFunil(id),
    meta.produtoSlug === "metodo-calice"
      ? consultarFunilPostHog(["quiz_started", "quiz_completed", "lead_submitted", "purchase"])
      : ehBiblioteca
        ? consultarFunilBiblioteca()
        : Promise.resolve(null),
    ehBiblioteca ? carregarLivrosBiblioteca() : Promise.resolve(null),
    ehBiblioteca ? carregarVendasBiblioteca() : Promise.resolve(null),
  ]);

  return (
    <>
      <PainelTopo
        titulo={meta.produto}
        voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
        controles={<span className="painel-badge">{meta.tipo}</span>}
        acoes={
          <a
            href={meta.urlPublica}
            target="_blank"
            rel="noreferrer"
            className="conteudo-botao-claro"
          >
            Abrir funil ↗
          </a>
        }
      />

      <div className="painel-conteudo">
      {visaoGeral && (
        <section className="mb-8">
          <Rotulo>
            {ehBiblioteca ? "Visão geral: vitrine → carrinho → pagou" : "Visão geral — quiz → lead → compra"}
          </Rotulo>
          <FunilEtapas etapas={visaoGeral} vazio="Sem evento suficiente ainda pra montar esse funil." />
          {ehBiblioteca && (
            <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
              As três primeiras etapas vêm do navegador e <b>subestimam</b>: parte do público chega
              pelo TikTok e bloqueia analytics. As duas últimas vêm do banco e são exatas. Não
              divida uma pela outra para achar conversão; para comparar livros entre si, serve.
            </p>
          )}
        </section>
      )}

      {vendas && (
        <section className="mb-8">
          <Rotulo>Vendas (verdade do banco)</Rotulo>
          <div className="glass-card flex flex-wrap gap-6 p-5">
            <Numero rotulo="Pedidos pagos" valor={String(vendas.pedidosPagos)} />
            <Numero rotulo="Aguardando" valor={String(vendas.pedidosAguardando)} />
            <Numero rotulo="Receita" valor={emReais(vendas.receitaCentavos)} />
            <Numero rotulo="Ticket médio" valor={emReais(vendas.ticketMedioCentavos)} />
          </div>
        </section>
      )}

      {vendas && vendas.maisComprados.length > 0 && (
        <section className="mb-8">
          <Rotulo>Livros mais comprados</Rotulo>
          <FunilEtapas etapas={vendas.maisComprados} vazio="Nenhuma compra ainda." />
        </section>
      )}

      {biblioteca?.vistos && (
        <section className="mb-8">
          <Rotulo>Livros mais abertos</Rotulo>
          <FunilEtapas etapas={biblioteca.vistos} vazio="Nenhuma visita a livro ainda." />
        </section>
      )}

      {biblioteca?.noCarrinho && (
        <section className="mb-8">
          <Rotulo>Livros mais postos no carrinho</Rotulo>
          <FunilEtapas etapas={biblioteca.noCarrinho} vazio="Nenhum livro no carrinho ainda." />
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
    </>
  );
}

function emReais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[0.62rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {valor}
      </p>
    </div>
  );
}

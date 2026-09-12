import { notFound } from "next/navigation";
import { Rotulo } from "@/components/ui";
import { FunilEtapas, type EtapaContagem } from "@/components/painel/Funil";
import { FunilPreview } from "@/components/painel/FunilPreview";
import { BarrasSemana, Distribuicao, FunilTelas } from "@/components/painel/FunilPainel";
import { RankingLivros } from "@/components/painel/RankingLivros";
import FiltroData from "@/components/painel/FiltroData";
import PainelTopo from "@/components/painel/PainelTopo";
import {
  FUNIS,
  carregarDetalheFunil,
  consultarFunilPostHog,
  consultarFunilBiblioteca,
  consultarOrigemBiblioteca,
  carregarLivrosBiblioteca,
  carregarVendasBiblioteca,
  carregarLeadsCalice,
  type DetalheFunil,
  type LeadsCalice,
  type RangeDatas,
} from "@/lib/painel-funis";

/* Detalhe de um funil (05/08): header com voltar/labels/link pro funil de
   verdade, preview ao vivo grande em cima, carrossel de etapas embaixo
   como seletor — ver FunilPreview.tsx. Método Cálice ganha uma faixa extra
   ("visão geral") acima do preview, porque é o único funil com um resumo
   de aquisição→compra que não é "etapa do quiz" (mistura evento de site
   com evento de compra no serena-app). */

export const dynamic = "force-dynamic";

export default async function FunilDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const { id } = await params;
  const { de, ate } = await searchParams;
  const range: RangeDatas = { de, ate };
  const meta = FUNIS.find((f) => f.id === id);
  if (!meta) notFound();

  const ehBiblioteca = meta.produtoSlug === "biblioteca-oculta";
  const ehCalice = meta.produtoSlug === "metodo-calice";

  const [detalhe, visaoGeral, biblioteca, vendas, origem, leadsCalice] = await Promise.all([
    carregarDetalheFunil(id, range),
    ehCalice
      ? consultarFunilPostHog(["quiz_started", "quiz_completed", "lead_submitted", "purchase"], range)
      : ehBiblioteca
        ? consultarFunilBiblioteca(range)
        : Promise.resolve(null),
    ehBiblioteca ? carregarLivrosBiblioteca(range) : Promise.resolve(null),
    ehBiblioteca ? carregarVendasBiblioteca(range) : Promise.resolve(null),
    ehBiblioteca ? consultarOrigemBiblioteca(range) : Promise.resolve(null),
    ehCalice ? carregarLeadsCalice(range) : Promise.resolve(null),
  ]);

  if (ehCalice) {
    return (
      <>
        <PainelTopo
          titulo={meta.produto}
          voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
          controles={
            <>
              <FiltroData />
              <span className="painel-badge">{meta.tipo}</span>
            </>
          }
          acoes={
            <a href={meta.urlPublica} target="_blank" rel="noreferrer" className="conteudo-botao-claro">
              Abrir funil ↗
            </a>
          }
        />
        <div className="painel-conteudo">
          <DetalheCalice detalhe={detalhe} visaoGeral={visaoGeral} leads={leadsCalice} urlPublica={meta.urlPublica} />
        </div>
      </>
    );
  }

  return (
    <>
      <PainelTopo
        titulo={meta.produto}
        voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
        controles={
          <>
            <FiltroData />
            <span className="painel-badge">{meta.tipo}</span>
          </>
        }
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
              Pedido pago antes de 28/08/2026 não aparece em &quot;pagou&quot;: o evento de pagamento
              só passou a se ligar à visita da mesma pessoa a partir dessa data.
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
          <RankingLivros etapas={vendas.maisComprados} vazio="Nenhuma compra ainda." />
        </section>
      )}

      {biblioteca?.vistos && (
        <section className="mb-8">
          <Rotulo>Livros mais abertos</Rotulo>
          <RankingLivros etapas={biblioteca.vistos} vazio="Nenhuma visita a livro ainda." />
        </section>
      )}

      {biblioteca?.noCarrinho && (
        <section className="mb-8">
          <Rotulo>Livros mais postos no carrinho</Rotulo>
          <RankingLivros etapas={biblioteca.noCarrinho} vazio="Nenhum livro no carrinho ainda." />
        </section>
      )}

      {vendas && vendas.porOrigem.length > 0 && (
        <section className="mb-8">
          <Rotulo>De onde vieram as vendas</Rotulo>
          <FunilEtapas etapas={vendas.porOrigem} vazio="Nenhuma venda ainda." />
          <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
            Perfil (utm_content) quando existe, senão canal (utm_source), senão &quot;direto&quot;.
            Pedido pago antes de 28/08/2026 cai em &quot;sem registro&quot;: a coluna não existia.
          </p>
        </section>
      )}

      {ehBiblioteca && origem && (
        <section className="mb-8">
          <Rotulo>De onde vieram as visitas</Rotulo>
          <FunilEtapas etapas={origem} vazio="Sem visita registrada ainda." />
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

/* Detalhe do Método Cálice redesenhado em 11/09/2026: números de cima, funil
   de telas com preview ao lado, e o que o banco sabe dos leads embaixo. Todas
   as métricas da versão anterior continuam (visão geral inteira, e em cada
   tela pessoas, % do início, passagem e perda). Biblioteca e Lar Interior
   seguem no layout antigo até migrarem. */
function DetalheCalice({
  detalhe,
  visaoGeral,
  leads,
  urlPublica,
}: {
  detalhe: DetalheFunil;
  visaoGeral: EtapaContagem[] | null;
  leads: LeadsCalice | null;
  urlPublica: string;
}) {
  const telas = detalhe.etapas;
  const abertura = telas[0]?.views ?? 0;
  // Tela 18 ("Resultado completo") só aparece depois de a pessoa deixar o e-mail.
  const deixouEmail = telas[17]?.views ?? 0;
  const semanas = leads?.porSemana ?? [];
  const completas = semanas.filter((s) => s.completa);
  const mediaSemana = completas.length
    ? Math.round(completas.reduce((soma, s) => soma + s.count, 0) / completas.length)
    : null;
  const atual = semanas.find((s) => s.atual);

  return (
    <>
      <section className="mb-8 funil-kpis">
        <div className="glass-card funil-kpi">
          <span className="funil-kpi-rotulo">Leads</span>
          <span className="funil-kpi-valor">{leads ? leads.total : "—"}</span>
          <span className="funil-kpi-apoio">pessoas únicas, contadas no banco</span>
        </div>
        <div className="glass-card funil-kpi">
          <span className="funil-kpi-rotulo">Leads por semana</span>
          <div className="flex items-end justify-between gap-3">
            <span className="funil-kpi-valor">{mediaSemana ?? "—"}</span>
            <BarrasSemana semanas={semanas} />
          </div>
          <span className="funil-kpi-apoio">
            {mediaSemana === null
              ? "o período não tem uma semana inteira"
              : `média de ${completas.length} semana${completas.length === 1 ? "" : "s"} inteira${completas.length === 1 ? "" : "s"}`}
            {atual ? ` · esta semana até agora: ${atual.count}` : ""}
          </span>
        </div>
        <div className="glass-card funil-kpi">
          <span className="funil-kpi-rotulo">Abriu o quiz → deixou e-mail</span>
          <span className="funil-kpi-valor">
            {abertura ? `${((deixouEmail / abertura) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          </span>
          <span className="funil-kpi-apoio">
            {deixouEmail} de {abertura} pessoas que viram a abertura
          </span>
        </div>
      </section>

      {visaoGeral && (
        <section className="mb-8">
          <Rotulo>Visão geral: quiz → lead → compra</Rotulo>
          <FunilEtapas etapas={visaoGeral} vazio="Sem evento suficiente ainda pra montar esse funil." />
          <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
            Aqui a mesma pessoa precisa cumprir as etapas em ordem, e o &quot;início&quot; é o clique pra
            começar, depois da abertura. Por isso os números ficam um pouco abaixo das telas logo abaixo,
            que contam quem viu cada tela. O número exato de leads é o do banco, no alto.
          </p>
        </section>
      )}

      <section className="mb-8">
        <Rotulo>Onde perde gente</Rotulo>
        <FunilTelas etapas={telas} previewUrls={detalhe.previewUrls} urlInicial={urlPublica} vazio={detalhe.vazio} />
      </section>

      {leads && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <Rotulo>De onde vêm os leads</Rotulo>
            <Distribuicao itens={leads.porOrigem} vazio="Nenhum lead no período." />
            <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
              Perfil (utm_content) quando existe, senão canal (utm_source), senão &quot;direto&quot;.
            </p>
          </div>
          <div>
            <Rotulo>Resultado do quiz</Rotulo>
            <Distribuicao itens={leads.porResultado} vazio="Nenhum lead no período." />
            <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
              O arquétipo que o quiz deu a cada lead, no primeiro opt-in dela.
            </p>
          </div>
        </section>
      )}
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

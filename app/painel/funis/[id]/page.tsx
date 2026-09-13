import { notFound } from "next/navigation";
import { Rotulo } from "@/components/ui";
import { FunilEtapas, type EtapaContagem } from "@/components/painel/Funil";
import { FunilPreview } from "@/components/painel/FunilPreview";
import { BarrasSemana, Distribuicao, FunilTelas } from "@/components/painel/FunilPainel";
import { RankingLivros } from "@/components/painel/RankingLivros";
import FiltroData from "@/components/painel/FiltroData";
import FiltroVariante from "@/components/painel/FiltroVariante";
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
  type FiltroEvento,
  type LeadsCalice,
  type RangeDatas,
} from "@/lib/painel-funis";
import {
  VARIANTE_LEGADO,
  carregarVariantesQuiz,
  escolherVariante,
  opcoesVariante,
  type VarianteQuiz,
} from "@/lib/quiz-variantes";

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
  searchParams: Promise<{ de?: string; ate?: string; variante?: string }>;
}) {
  const { id } = await params;
  const { de, ate, variante: variantePedida } = await searchParams;
  const range: RangeDatas = { de, ate };
  const meta = FUNIS.find((f) => f.id === id);
  if (!meta) notFound();

  const ehBiblioteca = meta.produtoSlug === "biblioteca-oculta";
  const ehCalice = meta.produtoSlug === "metodo-calice";

  if (ehCalice) {
    /* As variantes vêm do site do quiz (`quiz/variantes.json`) e tudo abaixo
       é recortado pela escolhida: telas, visão geral, material e leads. */
    const variantes = await carregarVariantesQuiz();
    const variante = variantes ? escolherVariante(variantes, variantePedida) : null;
    const padrao = variantes ? escolherVariante(variantes) : null;

    const [detalhe, visaoGeral, leadsCalice] = await Promise.all([
      carregarDetalheFunil(id, range, variante),
      consultarFunilPostHog(
        ["quiz_started", "quiz_completed", "lead_submitted", "purchase"],
        range,
        variante && variantes ? filtroVisaoGeral(variante, variantes) : undefined
      ),
      carregarLeadsCalice(range, variante?.id),
    ]);

    // Variante que não é a padrão abre com ?v=, senão o botão levaria pra outra.
    const urlFunil =
      variante && padrao && variante.id !== padrao.id ? `${meta.urlPublica}?v=${variante.id}` : meta.urlPublica;

    return (
      <>
        <PainelTopo
          titulo={meta.produto}
          voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
          controles={
            <>
              {variantes && variante && padrao && variantes.length > 1 && (
                <FiltroVariante opcoes={opcoesVariante(variantes)} atual={variante.id} padrao={padrao.id} />
              )}
              <FiltroData />
              <span className="painel-badge">{meta.tipo}</span>
            </>
          }
          acoes={
            <a href={urlFunil} target="_blank" rel="noreferrer" className="conteudo-botao-claro">
              Abrir funil ↗
            </a>
          }
        />
        <div className="painel-conteudo">
          {variante && variante.status !== "ativa" && (
            <p className="mb-6 text-xs" style={{ color: "var(--ink-soft)" }}>
              <b>{variante.nome} está em {variante.status}</b>: não recebe tráfego, só abre por{" "}
              <code>?v={variante.id}</code>. Os números dele são de quem abriu por esse link.
              {variante.descricao ? ` ${variante.descricao}.` : ""}
            </p>
          )}
          <DetalheCalice detalhe={detalhe} visaoGeral={visaoGeral} leads={leadsCalice} urlPublica={urlFunil} />
        </div>
      </>
    );
  }

  const [detalhe, visaoGeral, biblioteca, vendas, origem] = await Promise.all([
    carregarDetalheFunil(id, range),
    ehBiblioteca ? consultarFunilBiblioteca(range) : Promise.resolve(null),
    ehBiblioteca ? carregarLivrosBiblioteca(range) : Promise.resolve(null),
    ehBiblioteca ? carregarVendasBiblioteca(range) : Promise.resolve(null),
    ehBiblioteca ? consultarOrigemBiblioteca(range) : Promise.resolve(null),
  ]);

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
  // A tela logo depois da captura só aparece pra quem deixou o e-mail. Achada
  // pelo tipo e não pela posição: numa variante com outra ordem, a posição 18
  // seria outra tela.
  const iCaptura = telas.findIndex((t) => t.tipo === "captura");
  const deixouEmail = iCaptura >= 0 ? telas[iCaptura + 1]?.views ?? 0 : 0;
  const leadsIndisponiveis = leads?.semVariante === "indisponivel";
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
          <span className="funil-kpi-valor">{leads && !leadsIndisponiveis ? leads.total : "—"}</span>
          <span className="funil-kpi-apoio">pessoas únicas, contadas no banco</span>
        </div>
        <div className="glass-card funil-kpi">
          <span className="funil-kpi-rotulo">Leads por semana</span>
          <div className="flex items-end justify-between gap-3">
            <span className="funil-kpi-valor">{mediaSemana ?? "—"}</span>
            <BarrasSemana semanas={semanas} />
          </div>
          <span className="funil-kpi-apoio">
            {leadsIndisponiveis
              ? "depende da variante no banco (ver abaixo)"
              : mediaSemana === null
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

      {leads?.semVariante && (
        <p className="-mt-4 mb-8 text-xs" style={{ color: "var(--ink-soft)" }}>
          {leadsIndisponiveis
            ? "Os leads desta variante ainda não aparecem: "
            : "Leads, origem e resultado abaixo somam todas as variantes: "}
          o banco ainda não guarda a variante do lead. Falta aplicar a migration{" "}
          <code>0004_add_quiz_variant.sql</code> do metodocalice-site no Supabase. As telas e a visão
          geral já vêm separadas por variante.
        </p>
      )}

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
        <FunilTelas etapas={telas} previewUrls={detalhe.previewUrls} urlInicial={urlPublica} vazio={detalhe.vazio} />
      </section>

      {leads && !leadsIndisponiveis && (
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

/* A visão geral recorta pela variante na PRIMEIRA etapa (`quiz_started`), ver
   `consultarFunilPostHog`. No V1, evento sem variante também conta (é de antes
   de 12/09/2026), e na FunnelsQuery o jeito de dizer isso é "não é nenhuma das
   outras": o `is_not` inclui evento sem a propriedade. Medido em 12/09/2026,
   quando nenhum evento tinha variante ainda: 249 inícios com e sem o filtro. */
function filtroVisaoGeral(variante: VarianteQuiz, variantes: VarianteQuiz[]): FiltroEvento[] | undefined {
  if (variante.id !== VARIANTE_LEGADO) {
    return [{ key: "quiz_variant", value: [variante.id], operator: "exact", type: "event" }];
  }
  const outras = variantes.filter((v) => v.id !== VARIANTE_LEGADO).map((v) => v.id);
  return outras.length ? [{ key: "quiz_variant", value: outras, operator: "is_not", type: "event" }] : undefined;
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

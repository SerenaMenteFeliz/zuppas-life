import { notFound } from "next/navigation";
import { Rotulo } from "@/components/ui";
import { Secao, Nota, Kpi } from "@/components/painel/Bloco";
import { FunilEtapas, type EtapaContagem } from "@/components/painel/Funil";
import { FunilPreview } from "@/components/painel/FunilPreview";
import { BarrasSemana, Distribuicao, FunilTelas, ResumoFunil } from "@/components/painel/FunilPainel";
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
   com evento de compra no serena-app).

   O Cálice foi padronizado em 18/09/2026 e é o único que já usa as peças de
   components/painel/Bloco.tsx (Secao, Nota, Kpi). Biblioteca e Lar Interior
   seguem no desenho antigo (Rotulo do tema da família, parágrafos de nota
   soltos, FunilEtapas) até serem migrados, que é decisão do Yan e não deste
   arquivo. Enquanto os dois mundos convivem, a regra é: nada do desenho novo
   entra numa seção que os outros dois também renderizam. */

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
          titulo={<TituloFunil produto={meta.produto} tipo={meta.tipo} />}
          voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
          controles={
            <>
              {variantes && variante && padrao && variantes.length > 1 && (
                <>
                  <FiltroVariante opcoes={opcoesVariante(variantes)} atual={variante.id} padrao={padrao.id} />
                  {/* Os dois grupos usam `.painel-badge` e, encostados, os
                      cinco chips liam como um controle só: "V1 V2 7 dias 30
                      dias 90 dias". Qual variante e qual período são perguntas
                      diferentes. */}
                  <span aria-hidden className="painel-topo-divisor" />
                </>
              )}
              <FiltroData />
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
            <div className="painel-secao">
              <Nota tom="atencao">
                <b>
                  {variante.nome} está em {variante.status}
                </b>
                : não recebe tráfego, só abre por <code>?v={variante.id}</code>. Os números desta
                tela são só de quem abriu por esse link.
                {variante.descricao ? ` ${variante.descricao}.` : ""}
              </Nota>
            </div>
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
        titulo={<TituloFunil produto={meta.produto} tipo={meta.tipo} />}
        voltar={{ href: "/painel/funis", rotulo: "Todos os funis" }}
        controles={<FiltroData />}
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

/* Detalhe do Método Cálice redesenhado em 11/09/2026 (números de cima, funil
   de telas com preview ao lado, o que o banco sabe dos leads embaixo) e
   padronizado em 18/09/2026, quando as três maneiras diferentes de desenhar
   "rótulo + número" viraram uma só e as notas de rodapé ganharam dois tons.
   Nenhuma métrica saiu em nenhuma das duas passadas. */
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
      {/* Faixa de números: é o resumo da tela, então não leva rótulo de seção
          (seria "resumo" em cima de três rótulos). O aviso da variante no banco
          vem colado nela porque é exatamente o primeiro número que ele afeta. */}
      <div className="painel-secao">
        <div className="painel-kpis">
          <Kpi
            rotulo="Leads"
            valor={leads && !leadsIndisponiveis ? leads.total : "—"}
            apoio="pessoas únicas, contadas no banco"
          />
          <Kpi
            rotulo="Leads por semana"
            valor={mediaSemana ?? "—"}
            apoio={
              <>
                {leadsIndisponiveis
                  ? "depende da variante no banco (ver abaixo)"
                  : mediaSemana === null
                  ? "o período não tem uma semana inteira"
                  : `média de ${completas.length} semana${completas.length === 1 ? "" : "s"} inteira${
                      completas.length === 1 ? "" : "s"
                    }`}
                {atual ? ` · esta semana até agora: ${atual.count}` : ""}
              </>
            }
          >
            <BarrasSemana semanas={semanas} />
          </Kpi>
          <Kpi
            rotulo="Abriu o quiz → deixou e-mail"
            valor={
              abertura
                ? `${((deixouEmail / abertura) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
                : "—"
            }
            apoio={`${deixouEmail} de ${abertura} pessoas que viram a abertura`}
          />
        </div>

        {leads?.semVariante && (
          <Nota tom="atencao">
            {leadsIndisponiveis
              ? "Os leads desta variante ainda não aparecem: "
              : "Leads, origem e resultado desta tela somam todas as variantes: "}
            o banco ainda não guarda a variante do lead. Falta aplicar a migration{" "}
            <code>0004_add_quiz_variant.sql</code> do metodocalice-site no Supabase. As telas e a
            visão geral já vêm separadas por variante.
          </Nota>
        )}
      </div>

      {visaoGeral && (
        <Secao
          titulo="Visão geral: quiz → lead → compra"
          nota={
            <Nota>
              Aqui a mesma pessoa precisa cumprir as etapas em ordem, e o &quot;início&quot; é o
              clique pra começar, depois da abertura. Por isso os números ficam um pouco abaixo dos
              das telas, que contam quem viu cada tela. O número exato de leads é o do banco, no
              alto.
            </Nota>
          }
        >
          <ResumoFunil etapas={visaoGeral} vazio="Sem evento suficiente ainda pra montar esse funil." />
        </Secao>
      )}

      <Secao titulo="Telas do quiz">
        <FunilTelas etapas={telas} previewUrls={detalhe.previewUrls} urlInicial={urlPublica} vazio={detalhe.vazio} />
      </Secao>

      {leads && !leadsIndisponiveis && (
        <div className="painel-duplas">
          <Secao
            titulo="De onde vêm os leads"
            nota={<Nota>Perfil (utm_content) quando existe, senão canal (utm_source), senão &quot;direto&quot;.</Nota>}
          >
            <Distribuicao itens={leads.porOrigem} vazio="Nenhum lead no período." />
          </Secao>
          <Secao
            titulo="Resultado do quiz"
            nota={<Nota>O arquétipo que o quiz deu a cada lead, no primeiro opt-in dela.</Nota>}
          >
            <Distribuicao itens={leads.porResultado} vazio="Nenhum lead no período." />
          </Secao>
        </div>
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

/* O tipo do funil ("Quiz", "Landing", "Catálogo") vivia no fim da linha de
   controles, depois dos campos de data, com a mesma pílula dos filtros. Não é
   controle: ninguém clica nele e ele não muda o que a tela mostra. É o que o
   funil É, então mora colado no nome dele (18/09/2026). */
function TituloFunil({ produto, tipo }: { produto: string; tipo: string }) {
  return (
    <>
      {produto} <span className="painel-badge painel-topo-tipo">{tipo}</span>
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

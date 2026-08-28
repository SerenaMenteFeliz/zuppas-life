import { Rotulo, Vazio } from "@/components/ui";
import { FunilEtapas, type EtapaContagem } from "@/components/painel/Funil";
import PainelTopo from "@/components/painel/PainelTopo";
import PreviaEmail from "@/components/painel/PreviaEmail";
import { EMAILS_BIBLIOTECA, ESPELHADO_EM } from "@/lib/biblioteca-email";
import { buscar } from "@/lib/painel-contatos";

/* Painel de automações de e-mail.

   Criado em 01/08 com as 3 sequências do Método Cálice (repo
   metodocalice-site). Em 28/08/2026 ganhou a Biblioteca Oculta e uma correção
   que valia mais que a feature nova, ver abaixo.

   O manifesto de slugs é um espelho manual do que existe em
   metodocalice-site/lib/{nutricao-sequence,lancamento-email,venda-sequence}.js:
   se um e-mail for adicionado, removido ou renomeado lá, este array precisa
   acompanhar à mão (os dois repos não compartilham código).

   A CORREÇÃO DE 28/08/2026, e ela é o motivo de `buscar` ter vindo pro lugar
   do `supabaseSelect` antigo: o helper anterior devolvia `[]` pra QUALQUER
   resposta não-ok. As tabelas `nutricao_emails_sent` e `nutricao_opt_out` não
   existem neste banco (404 `Could not find the table`), e a tela mostrava
   "0 e-mails enviados" e "0 opt-out" como se fossem medição. Zero medido e
   zero por tabela ausente são coisas diferentes, e a diferença decide se
   alguém vai investigar o cron ou rodar uma migration. Agora a tela diz qual
   dos dois é. */

export const dynamic = "force-dynamic";

type SequenciaId = "aquecimento" | "lancamento" | "venda";

const SEQUENCIAS: {
  id: SequenciaId;
  nome: string;
  descricao: string;
  gatilho: string;
  passos: { slug: string; rotulo: string }[];
}[] = [
  {
    id: "aquecimento",
    nome: "Aquecimento pré-lançamento",
    descricao:
      "Dispara pra todo lead do quiz do Método Cálice que ainda não recebeu o lançamento oficial. Cadência Dia 0/1/3/5/7/10, sem CTA de compra: o Dia 7 e o Dia 10 só avisam que o produto está vindo.",
    gatilho: "Cron diário, api/cron-nutricao.js (metodocalice-site)",
    passos: [
      { slug: "dia0-entrega", rotulo: "Dia 0 · Entrega do material" },
      { slug: "dia1-padrao", rotulo: "Dia 1 · Aprofundamento do padrão" },
      { slug: "dia3-nao-e-culpa", rotulo: "Dia 3 · Não é falta de vontade" },
      { slug: "dia5-caminho", rotulo: "Dia 5 · O caminho" },
      { slug: "dia7-em-breve", rotulo: "Dia 7 · Ainda não abri, mas aviso" },
      { slug: "dia10-fique-de-olho", rotulo: "Dia 10 · Fique de olho" },
    ],
  },
  {
    id: "lancamento",
    nome: "Lançamento oficial",
    descricao:
      "Disparo único e manual pra base inteira, no dia que o Yan decidir abrir o Método Cálice de vez. Assim que alguém recebe este e-mail, sai da fila do Aquecimento e entra na fila da Venda.",
    gatilho: "Manual, POST /api/enviar-lancamento (metodocalice-site, protegido por CRON_SECRET)",
    passos: [{ slug: "lancamento-oficial", rotulo: "Anúncio de lançamento" }],
  },
  {
    id: "venda",
    nome: "Venda pós-lançamento",
    descricao:
      "Só pra quem já recebeu o lançamento e ainda não comprou (checa product_access em tempo real a cada execução). Cadência a partir da data do lançamento de cada contato, não do calendário.",
    gatilho: "Cron diário, api/cron-venda.js (metodocalice-site)",
    passos: [
      { slug: "venda1-objecao", rotulo: "Venda 1 · Objeção" },
      { slug: "venda2-por-dentro", rotulo: "Venda 2 · O que tem dentro" },
      { slug: "venda3-fechamento", rotulo: "Venda 3 · Fechamento" },
    ],
  },
];

type EnvioRow = { contact_id: string; email_slug: string; sent_at: string };
type PedidoRow = { status: string | null; acesso_enviado_em: string | null; pago_em: string | null };

export default async function AutomacoesPage() {
  const [envios, optOuts, leads, pedidos] = await Promise.all([
    buscar<EnvioRow>("nutricao_emails_sent?select=contact_id,email_slug,sent_at&order=sent_at.asc"),
    buscar<{ contact_id: string }>("nutricao_opt_out?select=contact_id"),
    buscar<{ contact_id: string }>(
      "lead_events?event_type=eq.isca&offer=eq.quiz-diagnostico&product=eq.metodo-calice&select=contact_id"
    ),
    buscar<PedidoRow>("bo_pedidos?select=status,acesso_enviado_em,pago_em"),
  ]);

  const semConfig = !process.env.SUPABASE_URL;

  const totalLeads = new Set(leads.linhas.map((l) => l.contact_id)).size;
  const totalEnvios = envios.linhas.length;
  const ultimoEnvio = totalEnvios > 0 ? envios.linhas[totalEnvios - 1].sent_at : null;

  const contagemPorSlug = new Map<string, number>();
  for (const e of envios.linhas) contagemPorSlug.set(e.email_slug, (contagemPorSlug.get(e.email_slug) ?? 0) + 1);

  const criados = pedidos.linhas.length;
  const pagos = pedidos.linhas.filter((p) => p.status === "pago").length;
  const acessoEnviado = pedidos.linhas.filter((p) => p.acesso_enviado_em).length;

  return (
    <>
      <PainelTopo titulo="Automações" />

      <div className="painel-conteudo">
        {semConfig ? (
          <Vazio>
            Sem dado ainda: confere se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão setadas nesse
            projeto (Vercel, zuppas-life, env vars).
          </Vazio>
        ) : (
          <>
            {/* ------------------------------------------------------------
                BIBLIOTECA OCULTA. Vem primeiro de propósito: é a única frente
                cujo e-mail está prestes a sair pra cliente pagante, e é a que
                o Yan revisa hoje. As sequências do Cálice ainda não têm nem
                tabela no banco.
                ------------------------------------------------------------ */}
            <section className="mb-10">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <Rotulo>Biblioteca Oculta</Rotulo>
                <span className={`painel-badge ${pagos > 0 ? "painel-badge-ativo" : "painel-badge-pendente"}`}>
                  {pagos > 0 ? "ativa" : "sem venda ainda"}
                </span>
                <span className="painel-badge painel-badge-pendente">transacional</span>
              </div>

              <p className="mb-3 max-w-[720px] text-sm" style={{ color: "var(--ink-soft)" }}>
                Não é sequência de nutrição e nunca vai ser: deste remetente só sai entrega de
                pedido e recuperação de acesso. Campanha para a lista de compradores da Biblioteca,
                no dia em que existir, sai de um domínio separado. A regra é do próprio repo, e
                existe porque o subdomínio de envio compartilha reputação com o domínio da Liz.
              </p>
              <p className="mb-4 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
                Gatilho: pagamento confirmado no webhook do Asaas (api/webhook-asaas.js), e pedido
                manual de reenvio (api/recuperar.js)
              </p>

              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <ResumoCard rotulo="Pedidos criados" valor={criados} />
                <ResumoCard
                  rotulo="Pagos"
                  valor={pagos}
                  nota={criados > 0 ? `${((pagos / criados) * 100).toFixed(0)}% dos pedidos` : undefined}
                />
                <ResumoCard
                  rotulo="Acesso entregue por e-mail"
                  valor={acessoEnviado}
                  nota={
                    pagos > 0 && acessoEnviado < pagos
                      ? `${pagos - acessoEnviado} pago(s) sem e-mail confirmado`
                      : undefined
                  }
                />
              </div>

              <div className="mb-5">
                <FunilEtapas
                  etapas={
                    [
                      { label: "Pedido criado", count: criados },
                      { label: "Pago", count: pagos },
                      { label: "Acesso enviado", count: acessoEnviado },
                    ] as EtapaContagem[]
                  }
                  vazio="Nenhum pedido ainda. A primeira compra de verdade preenche este funil sozinha."
                />
              </div>

              <p className="mb-2.5 text-[0.72rem] font-medium" style={{ color: "var(--ink)" }}>
                Os e-mails, como eles chegam
              </p>
              <PreviaEmail emails={EMAILS_BIBLIOTECA} espelhadoEm={ESPELHADO_EM} />

              <div className="mt-3 space-y-1.5">
                {EMAILS_BIBLIOTECA.map((e) => (
                  <p key={e.id} className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
                    <b style={{ color: "var(--ink)" }}>{e.nome}:</b> {e.quando}. {e.medicao}
                  </p>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------------------
                MÉTODO CÁLICE
                ------------------------------------------------------------ */}
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <Rotulo>Método Cálice</Rotulo>
            </div>

            <section className="mb-6 grid gap-4 sm:grid-cols-3">
              <ResumoCard rotulo="Leads elegíveis (quiz Método Cálice)" valor={totalLeads} />
              <ResumoCard
                rotulo="E-mails enviados no total"
                valor={totalEnvios}
                indisponivel={!envios.ok}
              />
              <ResumoCard
                rotulo="Opt-out da sequência"
                valor={optOuts.linhas.length}
                indisponivel={!optOuts.ok}
                nota={
                  optOuts.ok && totalLeads > 0
                    ? `${((optOuts.linhas.length / totalLeads) * 100).toFixed(1)}% dos leads`
                    : undefined
                }
              />
            </section>

            {/* A distinção que faltava até 28/08/2026. */}
            {!envios.ok || !optOuts.ok ? (
              <div
                className="mb-8 rounded-lg px-4 py-3 text-[0.74rem]"
                style={{ background: "rgba(200,120,60,.14)", color: "var(--ink)" }}
              >
                <p className="mb-1 font-medium">
                  Estas sequências não estão sem envio: elas estão sem tabela.
                </p>
                <ul className="list-disc pl-5" style={{ color: "var(--ink-soft)" }}>
                  {!envios.ok && <li>nutricao_emails_sent: {envios.erro}</li>}
                  {!optOuts.ok && <li>nutricao_opt_out: {optOuts.erro}</li>}
                </ul>
                <p className="mt-1.5" style={{ color: "var(--ink-soft)" }}>
                  Enquanto a migration não rodar no Supabase, nenhum cron do metodocalice-site tem
                  onde gravar, e os zeros acima não medem nada. Até 28/08/2026 esta tela mostrava
                  esses zeros sem dizer isso.
                </p>
              </div>
            ) : (
              totalEnvios === 0 && (
                <div className="mb-8">
                  <Vazio>
                    As tabelas existem e estão vazias: nenhum envio registrado ainda. Aqui o zero é
                    medição de verdade, e aponta pro cron, não pro schema.
                  </Vazio>
                </div>
              )
            )}

            <p className="mb-8 text-xs" style={{ color: "var(--ink-soft)" }}>
              Último envio registrado:{" "}
              {envios.ok
                ? ultimoEnvio
                  ? new Date(ultimoEnvio).toLocaleString("pt-BR")
                  : "nenhum ainda"
                : "indisponível, a tabela não existe"}
            </p>

            {SEQUENCIAS.map((seq) => {
              const etapas: EtapaContagem[] = seq.passos.map((p) => ({
                label: p.rotulo,
                count: contagemPorSlug.get(p.slug) ?? 0,
              }));
              const jaDisparou = etapas.some((e) => e.count > 0);

              return (
                <section key={seq.id} className="mb-8">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <Rotulo>{seq.nome}</Rotulo>
                    <span
                      className={`painel-badge ${
                        !envios.ok ? "painel-badge-pendente" : jaDisparou ? "painel-badge-ativo" : "painel-badge-pendente"
                      }`}
                    >
                      {!envios.ok ? "sem tabela" : jaDisparou ? "ativa" : "sem envio ainda"}
                    </span>
                  </div>
                  <p className="mb-3 max-w-[720px] text-sm" style={{ color: "var(--ink-soft)" }}>
                    {seq.descricao}
                  </p>
                  <p className="mb-4 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
                    Gatilho: {seq.gatilho}
                  </p>
                  <FunilEtapas
                    etapas={etapas}
                    vazio={
                      envios.ok
                        ? "Nenhum e-mail desta sequência foi enviado ainda."
                        : "Sem tabela no banco, então não há o que contar aqui."
                    }
                  />
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

function ResumoCard({
  rotulo,
  valor,
  nota,
  indisponivel,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  indisponivel?: boolean;
}) {
  return (
    <div className="glass-card p-5">
      <p className="text-[0.68rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      {indisponivel ? (
        <>
          <p className="mt-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)", opacity: 0.45 }}>
            n/d
          </p>
          <p className="mt-0.5 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
            tabela não existe no banco
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {valor}
          </p>
          {nota && (
            <p className="mt-0.5 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
              {nota}
            </p>
          )}
        </>
      )}
    </div>
  );
}

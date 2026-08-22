import { Rotulo, Vazio } from "@/components/ui";
import { FunilEtapas, type EtapaContagem } from "@/components/painel/Funil";
import PainelTopo from "@/components/painel/PainelTopo";

/* Painel de automações de e-mail — criado em 01/08 junto com as 3 sequências
   do Método Cálice (repo metodocalice-site): aquecimento pré-lançamento,
   lançamento oficial (disparo único) e venda pós-lançamento. Consulta as
   MESMAS tabelas que os crons de lá escrevem (nutricao_emails_sent,
   nutricao_opt_out) — mesmo projeto Supabase "Serena Mente Feliz" reaproveitado
   por todo o guarda-chuva, ver Arquitetura - Dados e Tracking no vault.

   O manifesto de slugs abaixo é um espelho manual do que existe em
   metodocalice-site/lib/{nutricao-sequence,lancamento-email,venda-sequence}.js
   — mesmo princípio do QUIZ_STEP_LABELS em app/painel/funis/page.tsx: se um
   e-mail for adicionado/removido/renomeado lá, este array precisa acompanhar
   à mão (os dois repos não compartilham código, são deploys independentes). */

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
      "Dispara pra todo lead do quiz do Método Cálice que ainda não recebeu o lançamento oficial. Cadência Dia 0/1/3/5/7/10, sem CTA de compra — o Dia 7 e o Dia 10 só avisam que o produto está vindo.",
    gatilho: "Cron diário — api/cron-nutricao.js (metodocalice-site)",
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
    gatilho: "Manual — POST /api/enviar-lancamento (metodocalice-site, protegido por CRON_SECRET)",
    passos: [{ slug: "lancamento-oficial", rotulo: "Anúncio de lançamento" }],
  },
  {
    id: "venda",
    nome: "Venda pós-lançamento",
    descricao:
      "Só pra quem já recebeu o lançamento e ainda não comprou (checa product_access em tempo real a cada execução). Cadência a partir da data do lançamento de cada contato, não do calendário.",
    gatilho: "Cron diário — api/cron-venda.js (metodocalice-site)",
    passos: [
      { slug: "venda1-objecao", rotulo: "Venda 1 · Objeção" },
      { slug: "venda2-por-dentro", rotulo: "Venda 2 · O que tem dentro" },
      { slug: "venda3-fechamento", rotulo: "Venda 3 · Fechamento" },
    ],
  },
];

type EnvioRow = { contact_id: string; email_slug: string; sent_at: string };

async function supabaseSelect<T>(path: string): Promise<T[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!resp.ok) return [];
  return resp.json();
}

export default async function AutomacoesPage() {
  const [envios, optOuts, leads] = await Promise.all([
    supabaseSelect<EnvioRow>("nutricao_emails_sent?select=contact_id,email_slug,sent_at&order=sent_at.asc"),
    supabaseSelect<{ contact_id: string }>("nutricao_opt_out?select=contact_id"),
    supabaseSelect<{ contact_id: string }>(
      "lead_events?event_type=eq.isca&offer=eq.quiz-diagnostico&product=eq.metodo-calice&select=contact_id"
    ),
  ]);

  const semConfig = process.env.SUPABASE_URL === undefined;
  const totalLeads = new Set(leads.map((l) => l.contact_id)).size;
  const totalEnvios = envios.length;
  const ultimoEnvio = envios.length > 0 ? envios[envios.length - 1].sent_at : null;

  const contagemPorSlug = new Map<string, number>();
  for (const e of envios) contagemPorSlug.set(e.email_slug, (contagemPorSlug.get(e.email_slug) ?? 0) + 1);

  return (
    <>
      <PainelTopo titulo="Automações" largura={1200} />

      <div className="mx-auto w-full max-w-[1200px]">
      {semConfig ? (
        <Vazio>
          Sem dado ainda — confere se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY estão
          setadas nesse projeto (Vercel → zuppas-life → env vars).
        </Vazio>
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <ResumoCard rotulo="Leads elegíveis (quiz Método Cálice)" valor={totalLeads} />
            <ResumoCard rotulo="E-mails enviados no total" valor={totalEnvios} />
            <ResumoCard
              rotulo="Opt-out da sequência"
              valor={optOuts.length}
              nota={totalLeads > 0 ? `${((optOuts.length / totalLeads) * 100).toFixed(1)}% dos leads` : undefined}
            />
          </section>

          {totalEnvios === 0 && (
            <div className="mb-8">
              <Vazio>
                Nenhum envio registrado ainda. Provavelmente o cron de nutrição ainda não
                foi ativado no metodocalice-site (migration 0003, CRON_SECRET, BREVO_API_KEY
                e deploy pendentes — ver memória do domínio no Vault Zuppas).
              </Vazio>
            </div>
          )}

          <p className="mb-8 text-xs" style={{ color: "var(--ink-soft)" }}>
            Último envio registrado: {ultimoEnvio ? new Date(ultimoEnvio).toLocaleString("pt-BR") : "nenhum ainda"}
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
                  <span className={`painel-badge ${jaDisparou ? "painel-badge-ativo" : "painel-badge-pendente"}`}>
                    {jaDisparou ? "ativa" : "sem envio ainda"}
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
                  vazio="Nenhum e-mail desta sequência foi enviado ainda."
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

function ResumoCard({ rotulo, valor, nota }: { rotulo: string; valor: number; nota?: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-[0.68rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      <p className="mt-1 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {valor}
      </p>
      {nota && (
        <p className="mt-0.5 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
          {nota}
        </p>
      )}
    </div>
  );
}

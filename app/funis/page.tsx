import { Rotulo, Vazio } from "@/components/ui";

/* Painel interno de funis — só pro Yan (protegido em middleware.ts, não é
   conteúdo de família, por isso fora do Nav). Server Component: os dados vêm
   direto do Supabase "Serena Mente Feliz" a cada carregamento, sem cache —
   é um painel de negócio, não uma tela que a família revisita o dia inteiro,
   então correção importa mais que velocidade aqui.

   Cobre hoje só o que dá pra calcular com o que já existe no Supabase (leads
   e compras). O detalhe por etapa dentro do quiz (quiz_started, cada
   pergunta...) só existe na PostHog — essa seção fica como pendência visível
   até termos uma Personal API Key de leitura da PostHog. Ver
   [[Arquitetura - Dados e Tracking]] no Vault Zuppas. */

export const dynamic = "force-dynamic";

const PRODUTOS = [
  { slug: "lar-interior", nome: "Lar Interior" },
  { slug: "metodo-calice", nome: "Método Cálice" },
] as const;

type LeadEvent = {
  contact_id: string;
  product: string;
  signed_at: string;
};

type ProductAccess = {
  contact_id: string;
  product: string;
  status: string;
};

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

function diasAtras(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

async function carregarFunis() {
  const [leads, acessos] = await Promise.all([
    supabaseSelect<LeadEvent>("lead_events?select=contact_id,product,signed_at"),
    supabaseSelect<ProductAccess>("product_access?select=contact_id,product,status&status=eq.active"),
  ]);

  return PRODUTOS.map(({ slug, nome }) => {
    const leadsDoProduto = leads.filter((l) => l.product === slug);
    const contatosUnicos = new Set(leadsDoProduto.map((l) => l.contact_id));
    const ultimos7d = new Set(
      leadsDoProduto.filter((l) => diasAtras(l.signed_at) <= 7).map((l) => l.contact_id)
    );
    const compras = new Set(
      acessos.filter((a) => a.product === slug.replace("-", "_")).map((a) => a.contact_id)
    );

    const totalLeads = contatosUnicos.size;
    const totalCompras = compras.size;
    const conversao = totalLeads > 0 ? (totalCompras / totalLeads) * 100 : 0;

    return {
      slug,
      nome,
      totalLeads,
      leads7d: ultimos7d.size,
      totalCompras,
      conversao,
    };
  });
}

export default async function Funis() {
  const funis = await carregarFunis();
  const semDados = funis.every((f) => f.totalLeads === 0);

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1400px] lg:px-10 lg:pt-10">
        <header className="mb-7">
          <p className="tv-rotulo mb-2">Painel interno · não é conteúdo de família</p>
          <h1
            className="text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
            Funis
          </h1>
        </header>

        {semDados ? (
          <Vazio>
            Sem dado ainda — confere se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY estão
            setadas nesse projeto (Vercel → zuppas-life → env vars).
          </Vazio>
        ) : (
          <section className="mb-8">
            <Rotulo>Aquisição → compra, por produto</Rotulo>
            <div className="grid gap-4 sm:grid-cols-2">
              {funis.map((f) => (
                <CardFunil key={f.slug} {...f} />
              ))}
            </div>
          </section>
        )}

        <section>
          <Rotulo>Funil detalhado do quiz (por etapa)</Rotulo>
          <Vazio>
            Pendente — precisa de uma Personal API Key de leitura da PostHog
            (diferente da chave do projeto, que só envia evento). Quando tiver:
            quiz_started → cada pergunta → quiz_completed → lead_submitted →
            purchase, com % de passagem entre cada uma.
          </Vazio>
        </section>
      </div>
    </main>
  );
}

function CardFunil({
  nome,
  totalLeads,
  leads7d,
  totalCompras,
  conversao,
}: {
  nome: string;
  totalLeads: number;
  leads7d: number;
  totalCompras: number;
  conversao: number;
}) {
  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {nome}
      </h3>

      <div className="flex items-stretch gap-3">
        <Etapa rotulo="Leads" valor={totalLeads} nota={`+${leads7d} nos últimos 7 dias`} />
        <Seta />
        <Etapa rotulo="Compras" valor={totalCompras} nota={`${conversao.toFixed(1)}% de conversão`} />
      </div>
    </div>
  );
}

function Etapa({ rotulo, valor, nota }: { rotulo: string; valor: number; nota: string }) {
  return (
    <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: "var(--glass)" }}>
      <p className="text-[0.7rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
        {rotulo}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {valor}
      </p>
      <p className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
        {nota}
      </p>
    </div>
  );
}

function Seta() {
  return (
    <div className="flex flex-none items-center" style={{ color: "var(--ink-soft)" }}>
      →
    </div>
  );
}

import { Vazio } from "@/components/ui";
import ListaContatos from "@/components/painel/ListaContatos";
import PainelTopo from "@/components/painel/PainelTopo";
import { carregarContatos } from "@/lib/painel-contatos";

/* Aba Contatos (28/08/2026, a pedido do Yan: "tudo precisa estar lá").

   É a primeira tela do painel que junta as quatro origens de pessoa num
   lugar só. A lógica de junção, e o custo dela, estão documentados em
   lib/painel-contatos.ts. */

export const dynamic = "force-dynamic";

export default async function ContatosPage() {
  const { pessoas, problemas, compradoresSemCadastro } = await carregarContatos();

  const comCompra = pessoas.filter((p) => p.pedidosPagos > 0).length;
  const receita = pessoas.reduce((s, p) => s + p.gastoCentavos, 0);
  const comWhatsapp = pessoas.filter((p) => p.whatsapp).length;

  return (
    <>
      <PainelTopo titulo="Contatos" />

      <div className="painel-conteudo">
        {problemas.length > 0 && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-[0.74rem]"
            style={{ background: "rgba(200,120,60,.14)", color: "var(--ink)" }}
          >
            <p className="mb-1 font-medium">Nem toda fonte respondeu, então os números abaixo estão incompletos:</p>
            <ul className="list-disc pl-5" style={{ color: "var(--ink-soft)" }}>
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card rotulo="Pessoas conhecidas" valor={String(pessoas.length)} />
          <Card
            rotulo="Já compraram"
            valor={String(comCompra)}
            nota={pessoas.length > 0 ? `${((comCompra / pessoas.length) * 100).toFixed(1)}% da base` : undefined}
          />
          <Card
            rotulo="Receita registrada"
            valor={`R$ ${(receita / 100).toFixed(2).replace(".", ",")}`}
            nota="Só pedido pago da Biblioteca"
          />
          <Card rotulo="Com WhatsApp" valor={String(comWhatsapp)} />
        </section>

        {/* Não é enfeite: a junção por e-mail é o limite real desta tela, e
            esconder isso faria alguém tomar decisão de segmentação em cima de
            uma contagem que não sabe o que está contando. */}
        <div
          className="mb-6 rounded-lg px-4 py-3 text-[0.72rem]"
          style={{ background: "rgba(120,110,160,.10)", color: "var(--ink-soft)" }}
        >
          <p>
            <b style={{ color: "var(--ink)" }}>Como estas pessoas foram juntadas:</b> por e-mail em
            minúscula, porque <code>bo_pedidos</code> não tem <code>contact_id</code>. A Biblioteca
            vende sem conta de propósito, então quem compra lá nunca vira linha em{" "}
            <code>contacts</code>.
          </p>
          <p className="mt-1">
            Quem usar e-mails diferentes no quiz e na compra aparece duas vezes aqui, e não há como
            saber que é a mesma pessoa.{" "}
            {compradoresSemCadastro > 0 && (
              <b style={{ color: "var(--ink)" }}>
                Hoje {compradoresSemCadastro}{" "}
                {compradoresSemCadastro === 1 ? "comprador está" : "compradores estão"} só na
                Biblioteca, sem cadastro nenhum do outro lado.
              </b>
            )}
          </p>
        </div>

        {pessoas.length === 0 && problemas.length === 0 ? (
          <Vazio>
            Nenhuma pessoa no banco ainda. Quando a captura do quiz ou a primeira compra da
            Biblioteca acontecer, ela aparece aqui sozinha.
          </Vazio>
        ) : (
          <ListaContatos pessoas={pessoas} />
        )}
      </div>
    </>
  );
}

function Card({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
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

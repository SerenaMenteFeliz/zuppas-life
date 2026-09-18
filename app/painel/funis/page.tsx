import Link from "next/link";
import PainelTopo from "@/components/painel/PainelTopo";
import { Nota } from "@/components/painel/Bloco";
import { Vazio } from "@/components/ui";
import { FUNIS, carregarResumoProdutos } from "@/lib/painel-funis";

/* Lista de funis, porta de entrada do painel (05/08, antes disso era uma
   página só com tudo empilhado). Cada linha é um funil (FUNIS em
   lib/painel-funis.ts), clicar leva pro detalhe em /painel/funis/[id], que tem
   o preview ao vivo e a lista de telas.

   Virou tabela em 18/09/2026. Eram três cards empilhados, cada um repetindo o
   rótulo da métrica em cima do próprio número, e o badge de tipo (de largura
   variável) empurrava o nome de cada produto pra um x diferente. Numa tela de
   três linhas, doze rótulos minúsculos e nenhuma coluna fechando. O desenho
   certo pra "os mesmos campos, repetidos por item" é uma tabela, e ela também
   deixa comparar dois funis lendo a coluna de cima a baixo, que é o gesto real
   nesta tela. Ver `.funis-tabela` em app/globals.css.

   Sem rótulo de seção de propósito: a tela tem um bloco só, o topo já diz
   "Funis" e o cabeçalho da tabela já nomeia cada coluna. "Todos os funis"
   acima disso era a terceira vez que a mesma coisa era dita.

   `leads7d` já era calculado em `carregarResumoProdutos` desde que a lista
   existe e nunca tinha aparecido em tela. Virou a coluna "7 dias": é o único
   número daqui que diz se o funil está VIVO, e os outros três são acumulados
   desde sempre. */

export const dynamic = "force-dynamic";

export default async function FunisPage() {
  const resumos = await carregarResumoProdutos();
  const semDados = resumos.every((r) => r.totalLeads === 0);

  return (
    <>
      <PainelTopo titulo="Funis" />

      <div className="painel-conteudo">
        {semDados ? (
          <Vazio>
            Sem dado ainda. Confere se SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY estão setadas nesse
            projeto (Vercel, zuppas-life, env vars).
          </Vazio>
        ) : (
          <>
            <div className="glass-card funis-tabela">
              <div className="funis-linha funis-linha-cabeca" aria-hidden>
                <span>Tipo</span>
                <span>Funil</span>
                <span>Leads</span>
                <span>7 dias</span>
                <span>Compras</span>
                <span>Conversão</span>
                <span />
              </div>

              {FUNIS.map((f) => {
                const resumo = resumos.find((r) => r.produtoSlug === f.produtoSlug);

                return (
                  <Link key={f.id} href={`/painel/funis/${f.id}`} className="funis-linha">
                    <span className="funis-tipo">{f.tipo}</span>

                    <span className="funis-produto">
                      {f.produto}
                      <span className="funis-url">{f.urlPublica.replace(/^https?:\/\//, "")}</span>
                    </span>

                    <span className="funis-num">{resumo?.totalLeads ?? 0}</span>
                    <span className="funis-num">{resumo?.leads7d ?? 0}</span>
                    <span className="funis-num">{resumo?.totalCompras ?? 0}</span>
                    <span className="funis-num">{(resumo?.conversao ?? 0).toFixed(1)}%</span>

                    <span className="funis-seta" aria-hidden>
                      ›
                    </span>
                  </Link>
                );
              })}
            </div>

            <Nota>
              Tudo aqui é acumulado de todo o período, menos &quot;7 dias&quot;. O filtro de datas
              vive dentro de cada funil. Na Biblioteca Oculta, &quot;leads&quot; é pedido criado (ela
              tem tabela própria e não passa por lead_events) e as cortesias ficam de fora dos dois
              números.
            </Nota>
          </>
        )}
      </div>
    </>
  );
}

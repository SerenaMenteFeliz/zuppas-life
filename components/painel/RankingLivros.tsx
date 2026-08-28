import { Vazio } from "@/components/ui";
import type { LivroBiblioteca } from "@/lib/catalogo-biblioteca";

/* Ranking de livros da Biblioteca Oculta, com capa e título de verdade —
   antes o painel só tinha `FunilEtapas`/`GaleriaFunil` (texto puro, título
   derivado do slug). Pedido do Yan (28/08/2026): "podemos ter a capa do
   livro e título como temos na biblioteca oculta pra mostrar o que tá sendo
   mais aberto". Componente de servidor (sem estado, sem clique) de propósito
   — é só leitura, o clique pra ver ao vivo já mora no card de baixo
   (FunilPreview). */

export type EtapaLivro = LivroBiblioteca & { count: number };

export function RankingLivros({ etapas, vazio }: { etapas: EtapaLivro[]; vazio: string }) {
  if (etapas.length === 0) return <Vazio>{vazio}</Vazio>;

  const topo = etapas[0].count || 1;

  return (
    <div className="-mx-2.5 flex gap-3 overflow-x-auto px-2.5 pb-1">
      {etapas.map((livro) => (
        <div key={livro.slug} className="glass-card w-[132px] flex-none overflow-hidden p-0">
          <div
            className="flex aspect-[2/3] items-end justify-center overflow-hidden"
            style={{ background: "linear-gradient(160deg, var(--glass), var(--line))" }}
          >
            {livro.capaUrl ? (
              // Thumbnail pequeno de host próprio da casa: otimizar via
              // next/image não paga o custo de configurar remotePatterns
              // pra 1 domínio só.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={livro.capaUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="p-3 text-center text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                sem capa
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="mb-1 truncate text-[0.72rem] font-semibold leading-tight" title={livro.titulo}>
              {livro.titulo}
            </p>
            <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {livro.count}
            </p>
            <p className="text-[0.62rem]" style={{ color: "var(--ink-soft)" }}>
              {((livro.count / topo) * 100).toFixed(0)}% do 1º
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

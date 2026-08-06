"use client";

import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Vazio } from "@/components/ui";

/* Peças visuais de funil, extraídas de app/funis/page.tsx em 01/08 quando o
   painel ganhou sidebar e uma segunda seção (Automações) que precisa do
   mesmo tipo de visualização (etapas em sequência, com queda entre elas) —
   sem isso, cada página reimplementaria o mesmo card. Virou "use client" em
   04/08 pro card de etapa poder abrir o popup de preview ao vivo, e ganhou
   `onSelecionar` em 05/08 pra também servir de seletor do preview embutido
   em FunilPreview.tsx (tela de detalhe). Os dados continuam vindo prontos
   do Server Component pai. */

export type EtapaContagem = { label: string; count: number };
export type EtapaGaleria = { label: string; views: number };

/* Gallery view de uma linha só — um card por etapa, rolagem horizontal.
   Views totais, % do início (taxa de visualização), % de passagem pra
   próxima etapa e % de perda.

   `previewUrls`, quando passado, torna cada card clicável: leva a etapa AO
   VIVO (iframe pra dentro do site real, com o preview mode dele — ver
   quiz/index.html e assets/posthog-init.js no metodocalice-site), não um
   screenshot. É array de string (alinhado por índice com `etapas`), não
   função — Server Component não pode passar função como prop pra Client
   Component (RSC serializa por JSON); o caller monta o array pronto.
   `null`/posição faltando = card não clicável.

   Dois modos de uso (05/08, quando o painel de funis virou lista + detalhe):
   - `onSelecionar` informado (tela de detalhe) → clique troca o preview
     GRANDE e fixo em cima (dono do estado é FunilPreview.tsx), o card fica
     só como seletor, sem popup próprio.
   - `onSelecionar` ausente (uso solto/futuro) → mantém o comportamento
     antigo, abre um popup com o preview daquela etapa. */
export function GaleriaFunil({
  etapas,
  vazio,
  previewUrls,
  ativo,
  onSelecionar,
}: {
  etapas: EtapaGaleria[];
  vazio: string;
  previewUrls?: (string | null)[];
  ativo?: number;
  onSelecionar?: (indice: number) => void;
}) {
  const [aberta, setAberta] = useState<{ url: string; label: string } | null>(null);

  if (etapas.length === 0 || etapas.every((e) => e.views === 0)) {
    return <Vazio>{vazio}</Vazio>;
  }

  const topo = etapas[0].views || 1;

  return (
    <>
      <div className="painel-carrossel -mx-2.5 flex gap-3 overflow-x-auto px-2.5 pb-3">
        {etapas.map((etapa, i) => {
          // Passagem/perda ficam na etapa de ORIGEM, não na de chegada — "82%
          // passou pra próxima etapa" descreve o que aconteceu depois desta
          // etapa, não antes dela (achado real 04/08: o rótulo já dizia
          // "próxima etapa" mas a conta usava a etapa anterior, descompasso
          // entre texto e número). Última etapa não tem próxima, fica "—".
          const proxima = i < etapas.length - 1 ? etapas[i + 1].views : null;
          const passagem = proxima !== null && etapa.views > 0 ? (proxima / etapa.views) * 100 : null;
          const perda = passagem !== null ? 100 - passagem : null;
          const doTopo = (etapa.views / topo) * 100;
          const url = previewUrls?.[i] ?? undefined;
          const selecionada = onSelecionar !== undefined && ativo === i;

          const acionar = () => {
            if (!url) return;
            if (onSelecionar) onSelecionar(i);
            else setAberta({ url, label: etapa.label });
          };

          return (
            <div
              key={`${etapa.label}-${i}`}
              className={`glass-card w-[168px] flex-none p-4${url ? " painel-card-clicavel" : ""}${selecionada ? " painel-card-ativo" : ""}`}
              {...(url
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    onClick: acionar,
                    onKeyDown: (e: ReactKeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        acionar();
                      }
                    },
                  }
                : {})}
            >
              <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                Etapa {i + 1}
              </p>
              <h4 className="mb-3 text-sm font-semibold leading-snug">{etapa.label}</h4>

              <p className="text-[0.65rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
                Total
              </p>
              <p className="mb-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {etapa.views}
              </p>
              <p className="mb-3 text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                {doTopo.toFixed(1)}% do início
              </p>

              <div className="border-t pt-2" style={{ borderColor: "var(--line)" }}>
                <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                  Passagem próxima etapa
                </p>
                <p
                  className="mb-1 text-sm font-semibold"
                  style={{ color: passagem === null ? "var(--ink-soft)" : "var(--accent)" }}
                >
                  {passagem === null ? "—" : `${passagem.toFixed(1)}%`}
                </p>
                <p className="text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                  Perda: {perda === null ? "—" : `${perda.toFixed(1)}%`}
                </p>
              </div>

              {url && (
                <p className="mt-3 text-[0.65rem] font-semibold" style={{ color: "var(--accent)" }}>
                  {onSelecionar ? (selecionada ? "Vendo agora" : "Ver aqui →") : "Ver ao vivo →"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!onSelecionar && aberta && <PreviewAoVivo url={aberta.url} label={aberta.label} onFechar={() => setAberta(null)} />}
    </>
  );
}

/* Popup expandido — iframe real do site em produção, não imagem estática.
   Largura de celular (é o formato que o quiz/landing foram desenhados
   pra), altura fixa com scroll interno se a etapa for mais alta que isso. */
function PreviewAoVivo({ url, label, onFechar }: { url: string; label: string; onFechar: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div className="painel-modal-backdrop" onClick={onFechar}>
      <div className="painel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="painel-modal-header">
          <span>{label}</span>
          <button type="button" className="painel-modal-fechar" onClick={onFechar} aria-label="Fechar preview">
            ×
          </button>
        </div>
        <div className="painel-modal-frame">
          <iframe src={url} title={label} />
        </div>
      </div>
    </div>
  );
}

/* Fileira única, com setas entre etapas — mais compacta que a galeria,
   melhor pra funil de poucas etapas que precisa caber numa linha só. */
export function FunilEtapas({ etapas, vazio }: { etapas: EtapaContagem[]; vazio: string }) {
  if (etapas.length === 0 || etapas.every((e) => e.count === 0)) {
    return <Vazio>{vazio}</Vazio>;
  }

  const primeira = etapas[0].count || 1;

  return (
    <div className="glass-card flex flex-col gap-3 p-5 lg:flex-row lg:items-stretch lg:gap-2">
      {etapas.map((etapa, i) => {
        // Mesmo bug do GaleriaFunil (achado e corrigido lá primeiro, 04/08):
        // a seta é desenhada DEPOIS do card i, mas calculava com a etapa
        // ANTERIOR — a % de "Início → Quiz concluído" aparecia na seta
        // entre "Quiz concluído" e "Virou lead", deslocada uma posição, e a
        // última transição real nunca era mostrada (i da última etapa não
        // desenha seta). Corrigido pra próxima etapa, igual lá.
        const proxima = i < etapas.length - 1 ? etapas[i + 1].count : null;
        const passagem = proxima !== null && etapa.count > 0 ? (proxima / etapa.count) * 100 : null;
        const doTotal = (etapa.count / primeira) * 100;

        return (
          <div key={`${etapa.label}-${i}`} className="flex flex-1 items-stretch gap-2">
            <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: "var(--glass)" }}>
              <p className="text-[0.7rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
                {etapa.label}
              </p>
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {etapa.count}
              </p>
              <p className="text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
                {i === 0 ? "100% (base)" : `${doTotal.toFixed(1)}% do início`}
              </p>
            </div>
            {i < etapas.length - 1 && (
              <div
                className="flex flex-none flex-col items-center justify-center gap-1"
                style={{ color: "var(--ink-soft)" }}
              >
                <span>→</span>
                {passagem !== null && <span className="text-[0.65rem] font-semibold">{passagem.toFixed(0)}%</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

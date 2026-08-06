"use client";

import { useState } from "react";
import { Vazio } from "@/components/ui";
import { GaleriaFunil, type EtapaGaleria } from "./Funil";

/* Tela de detalhe de um funil (05/08): preview grande e fixo em cima, dono
   do estado de "qual etapa estou vendo"; carrossel de cards embaixo é só o
   seletor (clicar num card troca o iframe de cima, não abre popup próprio —
   ver onSelecionar em GaleriaFunil). Substitui o popup por etapa que existia
   antes: aqui o preview já É a tela, não precisa reabrir. */
export function FunilPreview({
  etapas,
  previewUrls,
  urlInicial,
  vazio,
}: {
  etapas: EtapaGaleria[];
  previewUrls: (string | null)[];
  urlInicial: string;
  vazio: string;
}) {
  const [ativo, setAtivo] = useState(0);

  if (etapas.length === 0 || etapas.every((e) => e.views === 0)) {
    return <Vazio>{vazio}</Vazio>;
  }

  const urlAtual = previewUrls[ativo] ?? urlInicial;
  const etapaAtual = etapas[ativo];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="painel-preview-panel glass-card">
        <div className="painel-preview-header">
          <span>
            Etapa {ativo + 1} de {etapas.length} · {etapaAtual.label}
          </span>
        </div>
        <div className="painel-preview-frame">
          <iframe src={urlAtual} title={etapaAtual.label} />
        </div>
      </div>

      <div className="w-full">
        <GaleriaFunil etapas={etapas} vazio={vazio} previewUrls={previewUrls} ativo={ativo} onSelecionar={setAtivo} />
      </div>
    </div>
  );
}

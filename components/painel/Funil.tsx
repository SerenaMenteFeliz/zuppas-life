import { Vazio } from "@/components/ui";

/* Peças visuais de funil, extraídas de app/funis/page.tsx em 01/08 quando o
   painel ganhou sidebar e uma segunda seção (Automações) que precisa do
   mesmo tipo de visualização (etapas em sequência, com queda entre elas) —
   sem isso, cada página reimplementaria o mesmo card. */

export type EtapaContagem = { label: string; count: number };
export type EtapaGaleria = { label: string; views: number };

export function CardMetrica({
  titulo,
  principal,
  principalRotulo,
  principalNota,
  secundario,
  secundarioRotulo,
  secundarioNota,
}: {
  titulo: string;
  principal: number;
  principalRotulo: string;
  principalNota: string;
  secundario: number;
  secundarioRotulo: string;
  secundarioNota: string;
}) {
  return (
    <div className="glass-card p-5">
      <h3 className="mb-4 text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {titulo}
      </h3>
      <div className="flex items-stretch gap-3">
        <EtapaMetrica rotulo={principalRotulo} valor={principal} nota={principalNota} />
        <SetaMetrica />
        <EtapaMetrica rotulo={secundarioRotulo} valor={secundario} nota={secundarioNota} />
      </div>
    </div>
  );
}

export function EtapaMetrica({ rotulo, valor, nota }: { rotulo: string; valor: number; nota: string }) {
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

export function SetaMetrica() {
  return (
    <div className="flex flex-none items-center" style={{ color: "var(--ink-soft)" }}>
      →
    </div>
  );
}

/* Gallery view de uma linha só — um card por etapa, rolagem horizontal.
   Views totais, % do início (taxa de visualização), % de passagem pra
   próxima etapa e % de perda. */
export function GaleriaFunil({ etapas, vazio }: { etapas: EtapaGaleria[]; vazio: string }) {
  if (etapas.length === 0 || etapas.every((e) => e.views === 0)) {
    return <Vazio>{vazio}</Vazio>;
  }

  const topo = etapas[0].views || 1;

  return (
    <div className="-mx-2.5 flex gap-3 overflow-x-auto px-2.5 pb-2">
      {etapas.map((etapa, i) => {
        const anterior = i > 0 ? etapas[i - 1].views : null;
        const passagem = anterior && anterior > 0 ? (etapa.views / anterior) * 100 : null;
        const perda = passagem !== null ? 100 - passagem : null;
        const doTopo = (etapa.views / topo) * 100;

        return (
          <div key={`${etapa.label}-${i}`} className="glass-card w-[168px] flex-none p-4">
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
          </div>
        );
      })}
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
        const anterior = i > 0 ? etapas[i - 1].count : null;
        const passagem = anterior && anterior > 0 ? (etapa.count / anterior) * 100 : null;
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

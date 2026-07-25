"use client";

import { INICIAL, PESSOAS, type Dono, type Pessoa } from "@/lib/types";

/* Peças pequenas e repetidas. Vivem juntas porque nenhuma delas justifica um
   arquivo, e separá-las só criaria seis imports pra três traços de CSS. */

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <h2 className="tv-rotulo mb-3">{children}</h2>;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 text-center">
      <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
        {children}
      </p>
    </div>
  );
}

/** Corrente de constância.

    Sete bolinhas: a meta escrita no vault é "7 dias seguidos com as 3 âncoras".
    Passando de sete, o número assume e as bolinhas ficam cheias, porque o que
    importa a partir dali é o número, não a régua. */
export function Corrente({ dias }: { dias: number }) {
  const cheias = Math.min(dias, 7);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className={`corrente-dia ${i < cheias ? "corrente-dia-cheio" : ""}`}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
        {dias === 0
          ? "a corrente começa hoje"
          : `${dias} dia${dias > 1 ? "s" : ""} seguidos`}
      </span>
    </div>
  );
}

/** Avatar por inicial. Sem foto de propósito: foto de família em painel exige
    manutenção e a inicial nunca fica desatualizada. */
export function Avatar({ dono, tamanho = 28 }: { dono: Dono; tamanho?: number }) {
  const casa = dono === "Casa";
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-semibold"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: tamanho * 0.42,
        background: casa ? "var(--glass)" : "var(--accent)",
        color: casa ? "var(--ink-soft)" : "var(--accent-foreground)",
        border: casa ? "1px solid var(--line)" : "none",
      }}
      title={dono}
    >
      {casa ? "◇" : INICIAL[dono as Pessoa]}
    </span>
  );
}

/** Quem está usando o aparelho.

    Existe porque não há auth ainda. Some na fase 2, quando o login responder
    isso sozinho. Até lá é a peça que faz "é seu" significar alguma coisa. */
export function SeletorPessoa({
  eu,
  aoTrocar,
}: {
  eu: Pessoa;
  aoTrocar: (p: Pessoa) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span style={{ color: "var(--ink-soft)" }}>Você é:</span>
      {PESSOAS.map((p) => (
        <button
          key={p}
          onClick={() => aoTrocar(p)}
          className={`chip ${p === eu ? "chip-ativo" : ""}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

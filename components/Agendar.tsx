"use client";

import { useMemo, useState } from "react";
import { agendar } from "@/lib/store";
import { porExtenso } from "@/lib/datas";
import { interpretar } from "@/lib/texto";
import {
  BLOCOS,
  BLOCO_LABEL,
  PESSOAS,
  type Bloco,
  type Dono,
  type Pessoa,
} from "@/lib/types";
import { Mais } from "./icones";

/* Agendar em uma frase.

   O formulário de sete campos virou um campo de texto que entende português:
   "amanhã 9h dentista da Akiane" já sai preenchido. Quem quiser mexer no
   detalhe abre "ajustar" e vê os campos.

   Duas regras que a pesquisa de UX deixa clara e que valem mais aqui do que em
   um app de trabalho:

   1. **O que foi entendido fica visível antes de confirmar.** Adivinhar errado
      em silêncio é pior que não adivinhar: a pessoa só descobre no dia que o
      compromisso não existe.
   2. **Sempre existe o caminho manual.** Nada depende de acertar a frase. */

export default function Agendar({
  data,
  eu,
  aoAgendar,
}: {
  data: string;
  eu: Pessoa;
  aoAgendar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [frase, setFrase] = useState("");
  const [ajustando, setAjustando] = useState(false);

  /* Sobrescritas manuais. `null` quer dizer "usa o que a frase disser". */
  const [dataManual, setDataManual] = useState<string | null>(null);
  const [horaManual, setHoraManual] = useState<string | null>(null);
  const [blocoManual, setBlocoManual] = useState<Bloco | null>(null);
  const [paraManual, setParaManual] = useState<Dono | null>(null);
  const [tipoManual, setTipoManual] = useState<"compromisso" | "lembrete" | null>(null);

  const lido = useMemo(() => interpretar(frase, data), [frase, data]);

  const final = {
    titulo: lido.titulo,
    data: dataManual ?? lido.data ?? data,
    horario: horaManual ?? lido.horario,
    bloco: blocoManual ?? lido.bloco ?? "tarde",
    para: paraManual ?? lido.para ?? "Casa",
    tipo: tipoManual ?? lido.tipo ?? "compromisso",
  };

  function fechar() {
    setAberto(false);
    setAjustando(false);
    setFrase("");
    setDataManual(null);
    setHoraManual(null);
    setBlocoManual(null);
    setParaManual(null);
    setTipoManual(null);
  }

  function salvar() {
    if (!final.titulo.trim()) return;
    agendar({
      titulo: final.titulo.trim(),
      data: final.data,
      horario: final.horario || undefined,
      bloco: final.bloco,
      para: final.para,
      tipo: final.tipo,
      criadoPor: eu,
    });
    fechar();
    aoAgendar?.();
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="glass-card flex w-full items-center justify-center gap-2 p-4 text-sm"
      >
        <Mais />
        Agendar alguma coisa
      </button>
    );
  }

  return (
    <div className="glass-card glass-card-strong flex flex-col gap-3 p-4">
      <input
        className="campo"
        placeholder="amanhã 9h dentista da Akiane"
        value={frase}
        onChange={(e) => setFrase(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") fechar();
        }}
        autoFocus
        aria-label="Escreva o compromisso em uma frase"
      />

      {/* O que foi entendido, sempre à vista */}
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
        aria-live="polite"
      >
        {final.titulo ? (
          <>
            <strong style={{ fontWeight: 500 }}>{final.titulo}</strong>
            <span style={{ color: "var(--ink-soft)" }}>·</span>
            <span style={{ color: "var(--ink-soft)" }}>{porExtenso(final.data)}</span>
            <span style={{ color: "var(--ink-soft)" }}>·</span>
            <span style={{ color: "var(--ink-soft)" }}>
              {final.horario ?? BLOCO_LABEL[final.bloco]}
            </span>
            <span style={{ color: "var(--ink-soft)" }}>·</span>
            <span style={{ color: "var(--ink-soft)" }}>
              {final.para === "Casa" ? "a casa toda" : final.para}
            </span>
            {final.tipo === "lembrete" && (
              <span style={{ color: "var(--gold)" }}>lembrete</span>
            )}
          </>
        ) : (
          <span style={{ color: "var(--ink-soft)" }}>
            Escreva o que precisa acontecer. Dá pra dizer o dia, a hora e de quem
            é na mesma frase.
          </span>
        )}
      </div>

      <button
        onClick={() => setAjustando((v) => !v)}
        className="self-start text-xs underline underline-offset-4"
        style={{ color: "var(--ink-soft)" }}
      >
        {ajustando ? "esconder campos" : "ajustar na mão"}
      </button>

      {ajustando && (
        <div className="flex flex-col gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                Dia
              </span>
              <input
                type="date"
                className="campo"
                value={final.data}
                onChange={(e) => setDataManual(e.target.value)}
              />
            </label>
            <label className="flex w-32 flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
                Hora
              </span>
              <input
                type="time"
                className="campo"
                value={final.horario ?? ""}
                onChange={(e) => setHoraManual(e.target.value)}
              />
            </label>
          </div>

          {!final.horario && (
            <div className="flex gap-2">
              {BLOCOS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBlocoManual(b)}
                  className={`aba ${b === final.bloco ? "aba-ativa" : ""}`}
                >
                  {BLOCO_LABEL[b]}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(["Casa", ...PESSOAS] as Dono[]).map((d) => (
              <button
                key={d}
                onClick={() => setParaManual(d)}
                className={`chip ${d === final.para ? "chip-ativo" : ""}`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {(["compromisso", "lembrete"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTipoManual(t)}
                className={`aba ${t === final.tipo ? "aba-ativa" : ""}`}
              >
                {t === "compromisso" ? "Compromisso" : "Lembrete"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="botao flex-1" onClick={salvar} disabled={!final.titulo.trim()}>
          Agendar
        </button>
        <button className="botao-fantasma" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

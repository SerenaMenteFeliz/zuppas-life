"use client";

import { useState } from "react";
import { agendar } from "@/lib/store";
import { porExtenso } from "@/lib/datas";
import {
  BLOCOS,
  BLOCO_LABEL,
  blocoDaHora,
  PESSOAS,
  type Bloco,
  type Dono,
  type Pessoa,
} from "@/lib/types";
import { Mais } from "./icones";

/* Agendar compromisso.

   O ponto do recurso não é ter calendário, é a casa inteira ver que uma coisa
   tem dia. Por isso o formulário é curto: título, pra quem, quando. Tudo o
   mais é opcional e tem padrão. Se agendar demorar mais que mandar mensagem no
   grupo pedindo pra alguém lembrar, ninguém agenda. */

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
  const [titulo, setTitulo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [quando, setQuando] = useState(data);
  const [horario, setHorario] = useState("");
  const [bloco, setBloco] = useState<Bloco>("tarde");
  const [para, setPara] = useState<Dono>("Casa");
  const [tipo, setTipo] = useState<"compromisso" | "lembrete">("compromisso");

  function fechar() {
    setAberto(false);
    setTitulo("");
    setDetalhe("");
    setHorario("");
    setQuando(data);
  }

  function salvar() {
    const limpo = titulo.trim();
    if (!limpo) return;
    agendar({
      titulo: limpo,
      detalhe: detalhe.trim() || undefined,
      data: quando,
      horario: horario || undefined,
      /* Com hora marcada, o bloco vem dela: ninguém deveria ter que dizer que
         09:00 é de manhã. Sem hora, vale a escolha da pessoa. */
      bloco: horario ? blocoDaHora(Number(horario.slice(0, 2))) : bloco,
      para,
      tipo,
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
        placeholder="O que precisa acontecer?"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
      />

      <input
        className="campo"
        placeholder="Detalhe (opcional)"
        value={detalhe}
        onChange={(e) => setDetalhe(e.target.value)}
      />

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Dia
          </span>
          <input
            type="date"
            className="campo"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
          />
        </label>
        <label className="flex w-32 flex-col gap-1">
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Hora
          </span>
          <input
            type="time"
            className="campo"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />
        </label>
      </div>

      {!horario && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Parte do dia
          </span>
          <div className="flex gap-2">
            {BLOCOS.map((b) => (
              <button
                key={b}
                onClick={() => setBloco(b)}
                className={`aba ${b === bloco ? "aba-ativa" : ""}`}
              >
                {BLOCO_LABEL[b]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
          De quem é
        </span>
        <div className="flex flex-wrap gap-2">
          {(["Casa", ...PESSOAS] as Dono[]).map((d) => (
            <button
              key={d}
              onClick={() => setPara(d)}
              className={`chip ${d === para ? "chip-ativo" : ""}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {(["compromisso", "lembrete"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`aba ${t === tipo ? "aba-ativa" : ""}`}
          >
            {t === "compromisso" ? "Compromisso" : "Lembrete"}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
        Vai aparecer no dia {porExtenso(quando)}, pra {para === "Casa" ? "a casa toda" : para}.
      </p>

      <div className="flex gap-2">
        <button className="botao flex-1" onClick={salvar} disabled={!titulo.trim()}>
          Agendar
        </button>
        <button className="botao-fantasma" onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

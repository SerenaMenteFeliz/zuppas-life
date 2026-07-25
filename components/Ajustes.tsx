"use client";

import Popup from "./Popup";
import { definirPreferencia, useZuppas } from "@/lib/store";
import { ESCALA_TEXTO, type TamanhoTexto } from "@/lib/types";

/* Ajustes de quem está usando.

   Três coisas, e nenhuma é enfeite:

   - **Tamanho do texto.** Requisito de acessibilidade, e requisito prático: a
     Liz abre isso às 7h sem óculos e a Akiane precisa de alvo grande.
   - **Modo calmo.** A pesquisa sobre interface pra pessoa neurodivergente pede
     um modo de baixa estimulação que esconda o que não é essencial. Aqui ele
     tira número de negócio, citação e enfeite, e deixa só o que a casa precisa
     fazer hoje.
   - **Folga da semana.** Deixa a corrente sobreviver a um dia perdido por
     semana. Ligada por padrão, e desligável por quem preferir a régua dura.

   Tudo persiste junto com o resto do estado, então a escolha vale entre
   sessões, que é o mínimo pra uma preferência de acessibilidade não virar
   trabalho repetido todo dia. */

const TAMANHOS: { valor: TamanhoTexto; rotulo: string }[] = [
  { valor: "normal", rotulo: "Normal" },
  { valor: "grande", rotulo: "Grande" },
  { valor: "maior", rotulo: "Maior" },
];

export default function Ajustes() {
  const { preferencias } = useZuppas();

  return (
    <Popup rotulo="Ajustes" alinhar="direita">
      {() => (
        <div className="flex w-64 flex-col gap-4 p-1">
          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
              Tamanho do texto
            </p>
            <div className="flex gap-1.5">
              {TAMANHOS.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => definirPreferencia({ tamanhoTexto: t.valor })}
                  className={`aba flex-1 ${
                    preferencias.tamanhoTexto === t.valor ? "aba-ativa" : ""
                  }`}
                  style={{ fontSize: `${ESCALA_TEXTO[t.valor] * 0.8}rem` }}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          <Chave
            titulo="Modo calmo"
            detalhe="Esconde números e enfeites. Só o que tem que ser feito."
            ligada={preferencias.modoCalmo}
            aoMudar={(v) => definirPreferencia({ modoCalmo: v })}
          />

          <Chave
            titulo="Folga da semana"
            detalhe="A corrente sobrevive a um dia perdido por semana."
            ligada={preferencias.folgaSemanal}
            aoMudar={(v) => definirPreferencia({ folgaSemanal: v })}
          />
        </div>
      )}
    </Popup>
  );
}

function Chave({
  titulo,
  detalhe,
  ligada,
  aoMudar,
}: {
  titulo: string;
  detalhe: string;
  ligada: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => aoMudar(!ligada)}
      className="flex items-start gap-3 rounded-xl px-1 py-1 text-left"
      role="switch"
      aria-checked={ligada}
    >
      <span
        className="chave mt-0.5"
        style={{
          background: ligada ? "var(--accent)" : "var(--line)",
        }}
      >
        <span
          className="chave-bolinha"
          style={{ transform: ligada ? "translateX(1.05rem)" : "translateX(0)" }}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm">{titulo}</span>
        <span className="text-[0.72rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
          {detalhe}
        </span>
      </span>
    </button>
  );
}

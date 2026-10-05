"use client";

import { useMemo } from "react";
import { nomeDoDiaCurto } from "@/lib/datas";
import {
  LINHAS_QUADRO,
  chaveCelula,
  indexarMarcacoes,
  partesDe,
  valeNoDia,
  type Marcacao,
} from "@/lib/quadro-itens";
import { COR_PESSOA, INICIAL, type Pessoa } from "@/lib/types";

/* A grade do Quadro da semana: uma linha por obrigação, sete colunas de
   segunda a domingo. A mesma grade serve a TV (só mostra) e o desktop
   (clica pra marcar); muda só o tamanho, que vem das variáveis CSS da classe
   de fora (`quadro-tv` ou `quadro-marcar`).

   Os quatro estados de uma célula, e por que cada um existe:
   - feito: a inicial de quem fez. Ninguém tem tarefa atribuída, mas todo
     mundo vê quem está fazendo, que é o placar sem precisar de placar.
   - faltou: dia que já passou com alguma parte sem marca. Fica tingido e não
     some, porque é isso que faz a TV cobrar sem ninguém cobrar.
   - não se aplica: escola no fim de semana. Quase invisível.
   - por vir: hoje e os dias seguintes, ainda em aberto, neutros. */

type Props = {
  dias: string[];
  hoje: string;
  marcacoes: Marcacao[];
  /** Presente só no modo de marcar. Sem ele a grade não reage a clique. */
  aoAlternar?: (m: Marcacao) => void;
  eu?: Pessoa | null;
};

export default function Grade({ dias, hoje, marcacoes, aoAlternar, eu }: Props) {
  const quem = useMemo(() => indexarMarcacoes(marcacoes), [marcacoes]);

  return (
    <div className="quadro-grade" role="table" aria-label="Quadro da semana">
      <div className="quadro-canto" role="columnheader" />
      {dias.map((dia) => (
        <div
          key={dia}
          role="columnheader"
          className={`quadro-dia ${dia === hoje ? "quadro-dia-hoje" : ""}`}
        >
          <span className="quadro-dia-nome">{dia === hoje ? "hoje" : nomeDoDiaCurto(dia)}</span>
          <span className="quadro-dia-num">{Number(dia.slice(8, 10))}</span>
        </div>
      ))}

      {LINHAS_QUADRO.map((linha) => {
        const partes = partesDe(linha);
        return (
          <div key={linha.id} className="quadro-linha" role="row">
            <div className="quadro-rotulo" role="rowheader">
              <span>{linha.rotulo}</span>
              {linha.partes && (
                <span className="quadro-rotulo-partes">
                  {linha.partes.map((p) => p.rotulo.toLowerCase()).join(" · ")}
                </span>
              )}
            </div>

            {dias.map((dia) => {
              const aplica = valeNoDia(linha, dia);
              const passou = dia < hoje;
              const marcadoPor = partes.map(
                (p) => quem.get(chaveCelula(linha.id, dia, p.id)) ?? []
              );
              const completo = aplica && marcadoPor.every((q) => q.length > 0);
              const faltou = aplica && passou && !completo;
              const estado = !aplica
                ? "quadro-na"
                : completo
                  ? "quadro-feito"
                  : faltou
                    ? "quadro-faltou"
                    : "quadro-aberto";

              return (
                <div
                  key={dia}
                  role="cell"
                  className={`quadro-celula ${estado} ${dia === hoje ? "quadro-celula-hoje" : ""}`}
                >
                  {aplica ? (
                    <div className={`quadro-slots ${linha.partes ? "quadro-slots-varios" : ""}`}>
                      {partes.map((p, i) => (
                        <Slot
                          key={p.id}
                          rotulo={linha.partes ? p.rotulo : linha.rotulo}
                          pessoas={marcadoPor[i]}
                          eu={eu}
                          clicavel={!!aoAlternar && !!eu && dia <= hoje}
                          aoClicar={() =>
                            eu && aoAlternar?.({ item: linha.id, data: dia, parte: p.id, pessoa: eu })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="quadro-na-ponto" aria-label="não se aplica">
                      ·
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Slot({
  rotulo,
  pessoas,
  eu,
  clicavel,
  aoClicar,
}: {
  rotulo: string;
  pessoas: Pessoa[];
  eu?: Pessoa | null;
  clicavel: boolean;
  aoClicar: () => void;
}) {
  const feito = pessoas.length > 0;
  const titulo = feito ? `${rotulo}: ${pessoas.join(", ")}` : `${rotulo}: em aberto`;
  const conteudo = feito ? (
    <span className="quadro-iniciais">
      {pessoas.slice(0, 3).map((p) => (
        <span
          key={p}
          className={`quadro-inicial ${p === eu ? "quadro-inicial-eu" : ""}`}
          style={{ background: COR_PESSOA[p] }}
        >
          {INICIAL[p]}
        </span>
      ))}
      {pessoas.length > 3 && <span className="quadro-mais">+{pessoas.length - 3}</span>}
    </span>
  ) : (
    <span className="quadro-vazio" />
  );

  if (!clicavel) {
    return (
      <span className="quadro-slot" title={titulo}>
        {conteudo}
      </span>
    );
  }
  return (
    <button type="button" className="quadro-slot quadro-slot-botao" title={titulo} onClick={aoClicar}>
      {conteudo}
    </button>
  );
}

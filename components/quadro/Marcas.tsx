import { COR_PESSOA, INICIAL, type Pessoa } from "@/lib/types";

/** As iniciais de quem fez, ou um círculo vazio quando ninguém fez ainda.
    Ninguém tem tarefa atribuída, mas todo mundo vê quem está fazendo. */
export default function Marcas({ pessoas, eu }: { pessoas: Pessoa[]; eu?: Pessoa | null }) {
  if (pessoas.length === 0) return <span className="quadro-vazio" aria-label="em aberto" />;
  return (
    <span className="quadro-iniciais" aria-label={`feito por ${pessoas.join(", ")}`}>
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
  );
}

"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { STATUS_INFO, tituloDe, type Post, type Status } from "@/lib/conteudo-tipos";

/* Casca da tela de post: header fixo no topo mais o estado compartilhado que
   ele mostra (Yan, 21/08/2026).

   ── Por que o header é fixo ──

   O post é a única tela do painel que rola de verdade (dados, roteiro de N
   falas, métricas). Rolando até a fala 12, sumiam de uma vez o título, o
   status, o caminho de volta e, pior, o aviso de que o trabalho está salvo.
   O indicador de autosave só serve se estiver visível **enquanto se digita**,
   que é justamente quando a página está rolada.

   ── Por que o estado mora aqui ──

   O indicador é um só no topo, mas quem salva são dois componentes separados
   (dados e roteiro). Cada um reporta o próprio estado por esta caixa, e o
   header mostra o pior deles: qualquer coisa não gravada tem que aparecer,
   mesmo que a outra metade esteja em dia. Título e status também sobem por
   aqui, pra que digitar o nome apareça no topo na mesma tecla. */

export type EstadoSalvamento = "parado" | "sujo" | "salvando" | "salvo" | "erro";

type Reporte = { estado: EstadoSalvamento; hora: string | null };

type Caixa = {
  reportar: (chave: string, r: Reporte) => void;
  trocarCabecalho: (c: { titulo?: string; status?: Status }) => void;
};

const CaixaPost = createContext<Caixa | null>(null);

export function usePostShell(): Caixa {
  const c = useContext(CaixaPost);
  if (!c) throw new Error("usePostShell precisa estar dentro de <PostShell>.");
  return c;
}

/* Pior estado vence. A ordem é a da urgência: erro é o que a pessoa precisa
   ver, "sujo" avisa que ainda não foi, e só quando tudo está em dia o topo
   pode dizer que está salvo. */
const PIOR: EstadoSalvamento[] = ["erro", "sujo", "salvando", "salvo", "parado"];

function juntar(reportes: Record<string, Reporte>): Reporte {
  const lista = Object.values(reportes);
  if (lista.length === 0) return { estado: "parado", hora: null };

  const estado = PIOR.find((e) => lista.some((r) => r.estado === e)) ?? "parado";
  /* A hora exibida é a da gravação mais recente entre as duas metades: é a
     resposta certa pra "quando foi a última vez que isso foi pro banco?". */
  const horas = lista.map((r) => r.hora).filter(Boolean) as string[];
  const hora = horas.length > 0 ? horas.sort().at(-1)! : null;
  return { estado, hora };
}

export default function PostShell({
  post,
  children,
}: {
  post: Post;
  children: React.ReactNode;
}) {
  const [titulo, setTitulo] = useState(post.titulo);
  const [status, setStatus] = useState<Status>(post.status as Status);
  const [reportes, setReportes] = useState<Record<string, Reporte>>({});

  const reportar = useCallback((chave: string, r: Reporte) => {
    setReportes((atuais) => ({ ...atuais, [chave]: r }));
  }, []);

  const trocarCabecalho = useCallback((c: { titulo?: string; status?: Status }) => {
    if (c.titulo !== undefined) setTitulo(c.titulo);
    if (c.status !== undefined) setStatus(c.status);
  }, []);

  const caixa = useMemo(() => ({ reportar, trocarCabecalho }), [reportar, trocarCabecalho]);

  const { estado, hora } = juntar(reportes);
  const st = STATUS_INFO[status] ?? STATUS_INFO.ideia;
  const vazio = titulo.trim() === "";

  return (
    <CaixaPost.Provider value={caixa}>
      {/* Mesma faixa das telas de lista (`.painel-topo`, 22/08/2026), pra que
          rolar de uma seção pro detalhe não mude a altura nem a posição do
          topo. O que muda é o conteúdo dela: aqui o título é o nome do post,
          e o lugar da ação é ocupado pelo indicador de autosave. */}
      <header
        className="painel-topo"
        style={{ ["--painel-topo-largura" as string]: "1100px" }}
      >
        <div className="painel-topo-linha">
          <div className="conteudo-topo-titulo">
            <h1
              className="conteudo-topo-h1"
              style={{ opacity: vazio ? 0.45 : 1 }}
              title={tituloDe({ titulo })}
            >
              {tituloDe({ titulo })}
            </h1>
            <span className="painel-badge">{st.rotulo}</span>
          </div>

          <div className="painel-topo-acoes">
            <IndicadorSalvo estado={estado} hora={hora} />
            <Link href="/painel/conteudo" className="conteudo-botao-claro">
              ‹ Conteúdo
            </Link>
          </div>
        </div>
      </header>

      {/* O limite de largura mora aqui e não na página, porque a faixa acima
          precisa ficar FORA dele: barra de topo cobre a área principal inteira,
          conteúdo fica na coluna de leitura. */}
      <div className="mx-auto w-full max-w-[1100px]">{children}</div>
    </CaixaPost.Provider>
  );
}

/* O indicador é a única prova de que o trabalho foi pro banco, então ele nunca
   some: mesmo parado ele diz "tudo salvo". Um espaço em branco no lugar seria
   indistinguível de "o app esqueceu de salvar". */
function IndicadorSalvo({ estado, hora }: { estado: EstadoSalvamento; hora: string | null }) {
  const texto =
    estado === "salvando"
      ? "salvando..."
      : estado === "erro"
        ? "não salvou"
        : estado === "sujo"
          ? "alterações não salvas"
          : estado === "salvo"
            ? "salvo" + (hora ? " às " + hora : "")
            : "tudo salvo";

  return (
    <span
      className={"conteudo-salvo" + (estado === "erro" ? " conteudo-salvo-erro" : "")}
      aria-live="polite"
    >
      {texto}
    </span>
  );
}

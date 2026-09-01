import Link from "next/link";
import {
  DIAS_DA_SEMANA,
  gradeDaSemana,
  gradeDoMes,
  rotuloDaSemana,
  rotuloDoMes,
} from "@/lib/conteudo-calendario";
import type { Paginacao } from "@/components/painel/ConteudoLista";
import { dataDoPost, perfilPorId, tituloDe, type PostResumo } from "@/lib/conteudo-tipos";
import { diasEntre } from "@/lib/datas";

/* Calendário: "o que já saiu e o que vai sair", numa olhada.

   Duas janelas desde 21/08/2026, e não uma com zoom: o **mês** responde "como
   está o mês" e a **semana** responde "o que eu faço agora". São perguntas
   diferentes, e a semana pode dar altura de sobra pra cada dia justamente
   porque só mostra sete.

   Sem componente de cliente: navegar é link com query string, não estado.
   Assim a URL é compartilhável e o botão voltar do navegador funciona, que é o
   que se espera de um calendário. Arrastar pra remarcar exigiria cliente e fica
   pra depois da direção assentar.

   **Os links de navegação chegam prontos desde 01/09/2026.** Este arquivo tinha
   um construtor de URL próprio, e ele envelheceu: nasceu em 21/08 conhecendo
   cinco parâmetros, e os filtros por coluna e a busca vieram depois, então
   avançar um mês apagava o recorte em silêncio. A regra de montar URL desta
   tela mora num lugar só, que é a página (ver `linksCalendario` lá). */
export default function ConteudoCalendario({
  mes,
  semana,
  janela,
  posts,
  semData,
  semDataPaginacao,
  hoje,
  links,
  sufixo,
}: {
  mes: string;
  semana: string;
  janela: "mes" | "semana";
  posts: PostResumo[];
  /** Os sem data que cabem nesta página, já ordenados do mais velho pro mais
      novo pela página. Chegam prontos porque quem monta URL desta tela é ela. */
  semData: PostResumo[];
  semDataPaginacao?: Paginacao;
  hoje: string;
  /** Navegação do calendário, já com o recorte inteiro preservado. */
  links: { anterior: string; proximo: string; janelaSemana: string; janelaMes: string };
  /** Query do recorte atual, pendurada no link do post pro voltar preservar. */
  sufixo: string;
}) {
  const naSemana = janela === "semana";
  const celulas = naSemana ? gradeDaSemana(semana) : gradeDoMes(mes).flat();

  const porDia = new Map<string, PostResumo[]>();
  for (const p of posts) {
    const d = dataDoPost(p);
    if (!d) continue;
    const lista = porDia.get(d) ?? [];
    lista.push(p);
    porDia.set(d, lista);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={links.anterior} className="chip">
          ‹ Anterior
        </Link>

        <div className="flex items-center gap-3">
          <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
            {naSemana ? rotuloDaSemana(semana) : rotuloDoMes(mes)}
          </p>
          {/* Semana à esquerda do Mês (Yan, 30/08/2026): a ordem do seletor lê
              do recorte menor pro maior, como um zoom saindo. O PADRÃO continua
              sendo o mês, que é o que responde "como está o mês" na abertura;
              ordem de exibição e valor inicial são decisões separadas. */}
          <nav className="conteudo-visoes">
            <Link
              href={links.janelaSemana}
              className={"conteudo-visao" + (naSemana ? " conteudo-visao-ativa" : "")}
            >
              Semana
            </Link>
            <Link
              href={links.janelaMes}
              className={"conteudo-visao" + (naSemana ? "" : " conteudo-visao-ativa")}
            >
              Mês
            </Link>
          </nav>
        </div>

        <Link href={links.proximo} className="chip">
          Próximo ›
        </Link>
      </div>

      <div className={"conteudo-calendario" + (naSemana ? " conteudo-calendario-semana" : "")}>
        {DIAS_DA_SEMANA.map((d) => (
          <div key={d} className="conteudo-cal-cabecalho">
            {d}
          </div>
        ))}

        {celulas.map((celula) => {
          const doDia = porDia.get(celula.iso) ?? [];
          return (
            <div
              key={celula.iso}
              className={
                "conteudo-cal-celula" +
                (celula.doMes ? "" : " conteudo-cal-fora") +
                (celula.iso === hoje ? " conteudo-cal-hoje" : "")
              }
            >
              <span className="conteudo-cal-numero">{Number(celula.iso.slice(8, 10))}</span>
              {doDia.map((p) => {
                const perfil = perfilPorId(p.perfil);
                return (
                  <Link
                    key={p.id}
                    href={"/painel/conteudo/" + p.id + sufixo}
                    className="conteudo-cal-post"
                    title={tituloDe(p) + " · " + (perfil?.rotulo ?? p.perfil)}
                    style={{ borderLeftColor: perfil?.cor ?? "var(--ink-soft)" }}
                  >
                    <span
                      className={p.status === "postado" ? "conteudo-cal-post-feito" : undefined}
                    >
                      {tituloDe(p)}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Ideia sem data marcada não some do calendário: fica num card embaixo.
          Sumir daria a impressão de calendário vazio quando na verdade tem
          trabalho parado esperando alguém marcar dia.

          Era uma nuvem de chips soltos até 30/08/2026, e ela tinha dois
          problemas que crescem juntos: não terminava nunca (todo item sem data
          entrava ali, pra sempre) e não dizia NADA sobre qual olhar primeiro.

          Agora é card com página, do mais velho pro mais novo, com a idade à
          mostra. A ordem é o que faz a faixa valer: uma ideia parada há 40 dias
          e uma de ontem são coisas diferentes, e sem a idade as duas liam
          igual. Sem esse critério, paginar só esconderia melhor. */}
      {semDataPaginacao && semDataPaginacao.total > 0 && (
        <div className="glass-card conteudo-semdata">
          <header className="conteudo-semdata-topo">
            <p className="conteudo-semdata-titulo">
              Sem data marcada <span>({semDataPaginacao.total})</span>
            </p>
            {semDataPaginacao.paginas > 1 && (
              <nav className="conteudo-semdata-nav" aria-label="Páginas dos posts sem data">
                {semDataPaginacao.anterior ? (
                  <a href={semDataPaginacao.anterior} className="chip">
                    ‹
                  </a>
                ) : (
                  <span className="chip conteudo-pagina-morta">‹</span>
                )}
                <span className="conteudo-paginacao-conta">
                  Página {semDataPaginacao.pagina} de {semDataPaginacao.paginas}{" "}
                  <span className="conteudo-paginacao-detalhe">
                    ({semDataPaginacao.ultimo - semDataPaginacao.primeiro + 1} de{" "}
                    {semDataPaginacao.total})
                  </span>
                </span>
                {semDataPaginacao.proxima ? (
                  <a href={semDataPaginacao.proxima} className="chip">
                    ›
                  </a>
                ) : (
                  <span className="chip conteudo-pagina-morta">›</span>
                )}
              </nav>
            )}
          </header>

          <ul className="conteudo-semdata-lista">
            {semData.map((p) => {
              const perfil = perfilPorId(p.perfil);
              const dias = diasEntre(p.criado_em.slice(0, 10), hoje);
              return (
                <li key={p.id}>
                  <Link
                    href={"/painel/conteudo/" + p.id + sufixo}
                    className="conteudo-semdata-item"
                    style={{ borderLeftColor: perfil?.cor ?? "var(--ink-soft)" }}
                  >
                    <span className="conteudo-semdata-nome">{tituloDe(p)}</span>
                    {/* Só a partir de uma semana: "parada há 1 dia" é ruído em
                        cima de ideia que nasceu ontem. */}
                    {dias >= 7 && (
                      <span
                        className="conteudo-semdata-idade"
                        style={dias >= 30 ? { color: "var(--terracotta)" } : undefined}
                      >
                        há {dias} dias
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

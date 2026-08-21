import Link from "next/link";
import { DIAS_DA_SEMANA, deslocarMes, gradeDoMes, rotuloDoMes } from "@/lib/conteudo-calendario";
import { dataDoPost, perfilPorId, tituloDe, type Post } from "@/lib/conteudo-tipos";

/* Calendário do mês: "o que já saiu e o que vai sair", numa olhada.

   Sem componente de cliente: navegar mês é link com query string, não estado.
   Assim a URL do mês é compartilhável e o botão voltar do navegador funciona,
   que é o que se espera de um calendário. Arrastar pra remarcar exigiria
   cliente e fica pra depois da direção assentar. */
export default function ConteudoCalendario({
  mes,
  posts,
  hoje,
  perfilFiltro,
}: {
  mes: string;
  posts: Post[];
  hoje: string;
  perfilFiltro?: string;
}) {
  const semanas = gradeDoMes(mes);

  const porDia = new Map<string, Post[]>();
  for (const p of posts) {
    const d = dataDoPost(p);
    if (!d) continue;
    const lista = porDia.get(d) ?? [];
    lista.push(p);
    porDia.set(d, lista);
  }

  const semData = posts.filter((p) => !dataDoPost(p));
  const query = (m: string) =>
    "/painel/conteudo?v=calendario&mes=" + m + (perfilFiltro ? "&perfil=" + perfilFiltro : "");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href={query(deslocarMes(mes, -1))} className="chip">
          ‹ anterior
        </Link>
        <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
          {rotuloDoMes(mes)}
        </p>
        <Link href={query(deslocarMes(mes, 1))} className="chip">
          próximo ›
        </Link>
      </div>

      <div className="conteudo-calendario">
        {DIAS_DA_SEMANA.map((d) => (
          <div key={d} className="conteudo-cal-cabecalho">
            {d}
          </div>
        ))}

        {semanas.flat().map((celula) => {
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
                    href={"/painel/conteudo/" + p.id}
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

      {/* Ideia sem data marcada não some do calendário: fica numa faixa embaixo.
          Sumir daria a impressão de calendário vazio quando na verdade tem
          trabalho parado esperando alguém marcar dia. */}
      {semData.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[0.68rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
            Sem data marcada ({semData.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {semData.map((p) => {
              const perfil = perfilPorId(p.perfil);
              return (
                <Link
                  key={p.id}
                  href={"/painel/conteudo/" + p.id}
                  className="conteudo-cal-post"
                  style={{ borderLeftColor: perfil?.cor ?? "var(--ink-soft)" }}
                >
                  {tituloDe(p)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

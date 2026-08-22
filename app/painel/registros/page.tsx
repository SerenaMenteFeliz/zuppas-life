import Link from "next/link";
import PainelTopo from "@/components/painel/PainelTopo";
import { baldesAtivos, facetasDeRegistros, listarRegistros, type Nivel } from "@/lib/registros";

/* A aba Registros: o log central da plataforma.

   ── Por que ela nasceu junto com a IA ──

   A cascata de modelo e a rotação de chave ESCONDEM falha por construção. Se
   uma das contas do Gemini cair, o sistema usa a próxima e continua
   funcionando, até a última cair, provavelmente com a Ge na frente da tela.

   É a mesma classe do defeito de 04/08: o fetch que gravava lead era
   fire-and-forget, o 500 não aparecia pra ninguém, e foram 23 leads reais
   perdidos em três dias sem ninguém saber. Sistema que se recupera sozinho
   precisa de um lugar onde a recuperação apareça, senão ele só adia a queda e
   tira o aviso.

   ── Por que "Registros" e não "Logs da IA" ──

   O escopo é a plataforma inteira (Yan, 22/08/2026). A IA é só o primeiro
   cliente. Por isso a tabela é genérica (`area` + `acao` + `detalhe` jsonb) e
   os filtros são montados a partir do que existe, não de uma lista fixa: a
   próxima área que precisar registrar alguma coisa não vai precisar mexer
   nesta tela.

   ── Filtro na URL, não em estado ──

   Mesma convenção das visões do painel de conteúdo: link compartilhável e botão
   voltar funcionando. */

export const dynamic = "force-dynamic";

const NIVEIS: { id: Nivel; rotulo: string }[] = [
  { id: "erro", rotulo: "Erros" },
  { id: "aviso", rotulo: "Avisos" },
  { id: "info", rotulo: "Tudo certo" },
];

export default async function RegistrosPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; nivel?: string; acao?: string }>;
}) {
  const filtro = await searchParams;

  const [registros, facetas, esgotados] = await Promise.all([
    listarRegistros({ area: filtro.area, nivel: filtro.nivel, acao: filtro.acao, limite: 200 }),
    facetasDeRegistros(),
    baldesAtivos(),
  ]);

  return (
    <>
      <PainelTopo
        titulo="Registros"
        controles={
          <div className="reg-filtros">
            <Grupo
              rotulo="Nível"
              atual={filtro.nivel}
              base={{ area: filtro.area, acao: filtro.acao }}
              chave="nivel"
              opcoes={NIVEIS.map((n) => ({ valor: n.id, rotulo: n.rotulo }))}
            />
            {facetas.areas.length > 1 && (
              <Grupo
                rotulo="Área"
                atual={filtro.area}
                base={{ nivel: filtro.nivel, acao: filtro.acao }}
                chave="area"
                opcoes={facetas.areas.map((a) => ({ valor: a, rotulo: a }))}
              />
            )}
          </div>
        }
      />

      <div className="painel-conteudo">
        {/* A cota vem primeiro porque é a única coisa aqui que explica um
            problema que está acontecendo AGORA. O resto é histórico. */}
        {esgotados.length > 0 && (
          <div className="glass-card mb-6 p-5">
            <h2 className="reg-titulo">Cota esgotada agora</h2>
            <p className="reg-ajuda">
              Cada linha é uma combinação de conta e modelo que bateu no limite diário do
              Google. A IA continua funcionando pelas outras: isto não é uma falha, é o
              rodízio trabalhando. Vira problema quando a lista cobre tudo.
            </p>
            <div className="overflow-x-auto">
              <table className="painel-tabela">
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Modelo</th>
                    <th>Volta em</th>
                  </tr>
                </thead>
                <tbody>
                  {esgotados.map((b) => (
                    <tr key={b.chave + b.modelo}>
                      <td>{b.chave}</td>
                      <td>{b.modelo}</td>
                      <td>
                        {b.horasParaVoltar === 0
                          ? "em menos de 1 hora"
                          : "em " + b.horasParaVoltar + (b.horasParaVoltar === 1 ? " hora" : " horas")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-card mb-10 p-5">
          <div className="reg-cabeca">
            <h2 className="reg-titulo">O que aconteceu</h2>
            {(filtro.area || filtro.nivel || filtro.acao) && (
              <Link href="/painel/registros" className="conteudo-botao-claro">
                Limpar filtro
              </Link>
            )}
          </div>

          {registros.length === 0 ? (
            <p className="reg-vazio">
              {filtro.area || filtro.nivel || filtro.acao
                ? "Nenhum registro com esse filtro."
                : "Nada registrado ainda. Esta tela se enche sozinha conforme o painel for usado. A primeira linha costuma ser a primeira vez que alguém usa a IA."}
            </p>
          ) : (
            <ol className="reg-lista">
              {registros.map((r) => (
                <li key={r.id} className={"reg-item reg-item-" + r.nivel}>
                  <div className="reg-item-topo">
                    <span className="reg-hora">{quandoFoi(r.criado_em)}</span>
                    <Link
                      href={"/painel/registros?area=" + encodeURIComponent(r.area)}
                      className="painel-badge"
                    >
                      {r.area}
                    </Link>
                    <Link
                      href={"/painel/registros?acao=" + encodeURIComponent(r.acao)}
                      className="reg-acao"
                    >
                      {r.acao}
                    </Link>
                    {r.duracao_ms !== null && (
                      <span className="reg-duracao">{(r.duracao_ms / 1000).toFixed(1)}s</span>
                    )}
                  </div>

                  <p className="reg-mensagem">{r.mensagem}</p>

                  {r.ref_tipo === "post" && r.ref_id && (
                    <Link href={"/painel/conteudo/" + r.ref_id} className="reg-ref">
                      abrir o post ›
                    </Link>
                  )}

                  {r.detalhe && Object.keys(r.detalhe).length > 0 && (
                    /* Detalhe fechado por padrão: 200 linhas de JSON aberto
                       transformariam a tela num despejo ilegível, e o que se
                       lê 90% do tempo é a mensagem. */
                    <details className="reg-detalhe">
                      <summary>detalhe</summary>
                      <pre>{JSON.stringify(r.detalhe, null, 2)}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}

          <p className="reg-rodape">
            Mostrando as {registros.length} mais recentes.
          </p>
        </div>
      </div>
    </>
  );
}

function Grupo({
  rotulo,
  chave,
  atual,
  base,
  opcoes,
}: {
  rotulo: string;
  chave: string;
  atual?: string;
  base: Record<string, string | undefined>;
  opcoes: { valor: string; rotulo: string }[];
}) {
  const href = (valor?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    if (valor) p.set(chave, valor);
    const q = p.toString();
    return "/painel/registros" + (q ? "?" + q : "");
  };

  return (
    <div className="reg-grupo">
      <span className="reg-grupo-rotulo">{rotulo}</span>
      <Link href={href()} className={"reg-chip" + (!atual ? " reg-chip-ativo" : "")}>
        Todos
      </Link>
      {opcoes.map((o) => (
        <Link
          key={o.valor}
          href={href(o.valor)}
          className={"reg-chip" + (atual === o.valor ? " reg-chip-ativo" : "")}
        >
          {o.rotulo}
        </Link>
      ))}
    </div>
  );
}

/* Data em fuso de Ubatuba, como o resto do app. `Date` cru formatado sem fuso
   mostraria o horário do servidor da Vercel, que roda em São Paulo hoje mas não
   é garantia de nada. */
function quandoFoi(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}


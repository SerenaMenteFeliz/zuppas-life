import Link from "next/link";
import { Vazio } from "@/components/ui";
import ConteudoQuadro from "@/components/painel/ConteudoQuadro";
import ConteudoCalendario from "@/components/painel/ConteudoCalendario";
import { contarFalas, listarPosts } from "@/lib/conteudo";
import { mesValido } from "@/lib/conteudo-calendario";
import {
  FORMATOS,
  PERFIS,
  STATUS_INFO,
  dataDoPost,
  perfilPorId,
  type Post,
  type Status,
} from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";
import { criarPostAcao } from "./acoes";

/* Painel de Conteúdo (11/08/2026) — a metade esquerda do funil.

   O /painel/funis só enxerga a partir de "visitou o quiz": tudo que acontece
   antes (que post levou a pessoa até a bio) era cego. Esta seção é onde o
   conteúdo que gera esse tráfego passa a ter registro.

   Três visões sobre a MESMA lista, porque são três perguntas diferentes:
   quadro = "onde travou", calendário = "o que sai quando", lista = "compara".
   A visão vive na URL e não em estado de cliente, pra ser compartilhável e
   pro botão voltar funcionar. */

export const dynamic = "force-dynamic";

type Busca = { v?: string; perfil?: string; mes?: string };

const VISOES = [
  { id: "quadro", rotulo: "Quadro" },
  { id: "calendario", rotulo: "Calendário" },
  { id: "lista", rotulo: "Lista" },
];

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const busca = await searchParams;
  const visao = VISOES.some((v) => v.id === busca.v) ? busca.v! : "quadro";
  const perfilFiltro = PERFIS.some((p) => p.id === busca.perfil) ? busca.perfil : undefined;

  const [todos, contagens] = await Promise.all([listarPosts(), contarFalas()]);
  const posts = perfilFiltro ? todos.filter((p) => p.perfil === perfilFiltro) : todos;

  const hoje = hojeISO();
  const mes = mesValido(busca.mes, hoje);

  const link = (mudanca: Partial<Busca>) => {
    const atual: Busca = { v: visao, perfil: perfilFiltro, mes: busca.mes, ...mudanca };
    const qs = new URLSearchParams();
    if (atual.v) qs.set("v", atual.v);
    if (atual.perfil) qs.set("perfil", atual.perfil);
    if (atual.mes) qs.set("mes", atual.mes);
    return "/painel/conteudo?" + qs.toString();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-6">
        <p className="text-[0.68rem] uppercase tracking-widest" style={{ color: "var(--ink-soft)" }}>
          Painel interno
        </p>
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
          Conteúdo
        </h1>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5">
          {VISOES.map((v) => (
            <Link
              key={v.id}
              href={link({ v: v.id })}
              className={"chip" + (v.id === visao ? " chip-ativo" : "")}
            >
              {v.rotulo}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Perfil:
          </span>
          <Link href={link({ perfil: undefined })} className={"chip" + (!perfilFiltro ? " chip-ativo" : "")}>
            todos
          </Link>
          {PERFIS.map((p) => (
            <Link
              key={p.id}
              href={link({ perfil: p.id })}
              className={"chip" + (p.id === perfilFiltro ? " chip-ativo" : "")}
            >
              <span className="conteudo-ponto" style={{ background: p.cor }} />
              {p.dono}
            </Link>
          ))}
        </div>
      </div>

      <form action={criarPostAcao} className="conteudo-novo">
        <input
          type="text"
          name="titulo"
          required
          placeholder="Ideia nova: sobre o que é esse post?"
          className="conteudo-novo-titulo"
        />
        <select name="perfil" className="conteudo-select" defaultValue={perfilFiltro ?? "geovana"}>
          {PERFIS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <select name="formato" className="conteudo-select" defaultValue="">
          <option value="">formato</option>
          {FORMATOS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button type="submit" className="conteudo-botao">
          Criar
        </button>
      </form>

      {todos.length === 0 ? (
        <Vazio>
          Nenhum post ainda. Se você já rodou o sql/0001_conteudo.sql no Supabase, é só criar o
          primeiro acima. Se a caixa acima der erro ao criar, provavelmente a migration ainda não
          foi aplicada.
        </Vazio>
      ) : visao === "quadro" ? (
        <ConteudoQuadro posts={posts} contagens={Object.fromEntries(contagens)} />
      ) : visao === "calendario" ? (
        <ConteudoCalendario mes={mes} posts={posts} hoje={hoje} perfilFiltro={perfilFiltro} />
      ) : (
        <Lista posts={posts} contagens={contagens} />
      )}
    </div>
  );
}

function Lista({
  posts,
  contagens,
}: {
  posts: Post[];
  contagens: Map<string, { total: number; gravadas: number }>;
}) {
  return (
    <div className="glass-card overflow-x-auto p-1">
      <table className="painel-tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th>Perfil</th>
            <th>Formato</th>
            <th>Pilar</th>
            <th>Status</th>
            <th>Data</th>
            <th>Roteiro</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const perfil = perfilPorId(p.perfil);
            const c = contagens.get(p.id);
            const data = dataDoPost(p);
            return (
              <tr key={p.id}>
                <td>
                  <Link href={"/painel/conteudo/" + p.id} style={{ color: "var(--accent)" }}>
                    {p.titulo}
                  </Link>
                </td>
                <td>
                  <span className="conteudo-ponto" style={{ background: perfil?.cor ?? "var(--ink-soft)" }} />
                  {perfil?.dono ?? p.perfil}
                </td>
                <td>{p.formato ?? "—"}</td>
                <td>{p.pilar ?? "—"}</td>
                <td>{STATUS_INFO[p.status as Status]?.rotulo ?? p.status}</td>
                <td>{data ? data.split("-").reverse().join("/") : "—"}</td>
                <td>{c ? c.gravadas + "/" + c.total : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

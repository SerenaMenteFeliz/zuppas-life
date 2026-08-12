import Link from "next/link";
import { notFound } from "next/navigation";
import RoteiroEditor from "@/components/painel/RoteiroEditor";
import { carregarFalas, carregarMetricas, carregarPost } from "@/lib/conteudo";
import {
  FORMATOS,
  PERFIS,
  PILARES,
  PRODUTOS,
  STATUS,
  STATUS_INFO,
  type Metrica,
  type Status,
} from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";
import { excluirPostAcao, salvarDadosAcao, salvarMetricaAcao } from "../acoes";

/* Detalhe do post: os dados, o roteiro e as métricas.

   A ordem da página é a ordem do trabalho — primeiro o que é o post, depois o
   que vai ser falado, por último o que aconteceu depois de publicar. */

export const dynamic = "force-dynamic";

const CAMPOS_METRICA: { chave: keyof Metrica; rotulo: string }[] = [
  { chave: "views", rotulo: "Views" },
  { chave: "alcance", rotulo: "Alcance" },
  { chave: "salvos", rotulo: "Salvos" },
  { chave: "compartilhamentos", rotulo: "Compart." },
  { chave: "comentarios", rotulo: "Coment." },
  { chave: "seguidores", rotulo: "Seg.+" },
  { chave: "cliques", rotulo: "Cliques" },
];

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await carregarPost(id);
  if (!post) notFound();

  const [falas, metricas] = await Promise.all([carregarFalas(id), carregarMetricas(id)]);
  const hoje = hojeISO();

  /* Se já existe coleta de hoje, o formulário nasce preenchido com ela.

     Achado testando ao vivo (11/08): o upsert é por linha inteira, então
     registrar de novo no mesmo dia preenchendo só "views" zerava alcance,
     salvos e seguidores — perda de dado silenciosa, o oposto do que o resto
     desta seção foi desenhado pra evitar. Prefiro resolver mostrando o que já
     está gravado a fazer merge parcial escondido no servidor: assim a pessoa
     VÊ os números da coleta de hoje e corrige o que quiser, em vez de
     confiar que o app adivinhou certo. Trocar a data pra um dia passado ainda
     abre a caixa vazia; isso é limite conhecido, não descuido. */
  const metricaDeHoje = metricas.find((m) => m.coletado_em === hoje);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className="mb-6">
        <Link href="/painel/conteudo" className="text-xs" style={{ color: "var(--ink-soft)" }}>
          ‹ Conteúdo
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}>
            {post.titulo}
          </h1>
          <span className="painel-badge">{STATUS_INFO[post.status as Status]?.rotulo ?? post.status}</span>
        </div>
      </header>

      <form action={salvarDadosAcao} className="glass-card mb-6 p-5">
        <input type="hidden" name="id" value={post.id} />

        <div className="conteudo-grade">
          <label className="conteudo-campo conteudo-campo-largo">
            <span>Título</span>
            <input type="text" name="titulo" defaultValue={post.titulo} required />
          </label>

          <label className="conteudo-campo">
            <span>Perfil</span>
            <select name="perfil" defaultValue={post.perfil}>
              {PERFIS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Formato</span>
            <select name="formato" defaultValue={post.formato ?? ""}>
              <option value="">—</option>
              {FORMATOS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Pilar</span>
            <select name="pilar" defaultValue={post.pilar ?? ""}>
              <option value="">—</option>
              {PILARES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Destino</span>
            <select name="produto" defaultValue={post.produto ?? ""}>
              {PRODUTOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Status</span>
            <select name="status" defaultValue={post.status}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_INFO[s].rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Quem grava</span>
            <input type="text" name="responsavel" defaultValue={post.responsavel ?? ""} placeholder="Ge, Liz..." />
          </label>

          <label className="conteudo-campo">
            <span>Data planejada</span>
            <input type="date" name="data_planejada" defaultValue={post.data_planejada ?? ""} />
          </label>

          <label className="conteudo-campo">
            <span>Data publicada</span>
            <input type="date" name="data_publicada" defaultValue={post.data_publicada ?? ""} />
          </label>

          <label className="conteudo-campo conteudo-campo-largo">
            <span>Link do post publicado</span>
            <input type="url" name="link" defaultValue={post.link ?? ""} placeholder="https://" />
          </label>

          <label className="conteudo-campo conteudo-campo-largo">
            <span>Referência (swipe file, print, vídeo que inspirou)</span>
            <input type="text" name="referencia" defaultValue={post.referencia ?? ""} />
          </label>

          <label className="conteudo-campo conteudo-campo-total">
            <span>Legenda</span>
            <textarea name="legenda" rows={4} defaultValue={post.legenda ?? ""} />
          </label>

          <label className="conteudo-campo conteudo-campo-total">
            <span>Hashtags</span>
            <input type="text" name="hashtags" defaultValue={post.hashtags ?? ""} />
          </label>

          <label className="conteudo-campo conteudo-campo-total">
            <span>Observação</span>
            <textarea name="observacao" rows={2} defaultValue={post.observacao ?? ""} />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="submit" className="conteudo-botao">
            Salvar dados
          </button>
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            O roteiro abaixo tem botão de salvar próprio.
          </span>
        </div>
      </form>

      <div className="glass-card mb-6 p-5">
        <RoteiroEditor postId={post.id} iniciais={falas} />
      </div>

      <div className="glass-card mb-6 p-5">
        <h2 className="mb-1 text-sm" style={{ fontFamily: "var(--font-display)" }}>
          Métricas
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--ink-soft)" }}>
          Uma linha por coleta, não um número só: reel continua rendendo por semanas, e o que
          interessa é a curva. Coletar de novo no mesmo dia corrige a linha em vez de duplicar.
          Entrada manual por enquanto — a API do Instagram exige conta Business ligada a uma Página,
          revisão da Meta e um piso de seguidores.
        </p>

        {metricas.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="painel-tabela">
              <thead>
                <tr>
                  <th>Coletado em</th>
                  {CAMPOS_METRICA.map((c) => (
                    <th key={String(c.chave)}>{c.rotulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.coletado_em.split("-").reverse().join("/")}</td>
                    {CAMPOS_METRICA.map((c) => (
                      <td key={String(c.chave)}>{(m[c.chave] as number | null) ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* `key` derivada dos valores: input com defaultValue é não-controlado e
            não reflete um re-render do servidor sozinho. Sem isso, salvar
            deixaria a caixa mostrando o valor antigo. */}
        <form
          key={JSON.stringify(metricaDeHoje ?? "nova")}
          action={salvarMetricaAcao}
          className="conteudo-metrica-form"
        >
          <input type="hidden" name="post_id" value={post.id} />
          <label className="conteudo-campo">
            <span>Coletado em</span>
            <input type="date" name="coletado_em" defaultValue={hoje} />
          </label>
          {CAMPOS_METRICA.map((c) => (
            <label key={String(c.chave)} className="conteudo-campo">
              <span>{c.rotulo}</span>
              <input
                type="text"
                inputMode="numeric"
                name={String(c.chave)}
                defaultValue={(metricaDeHoje?.[c.chave] as number | null) ?? ""}
              />
            </label>
          ))}
          <button type="submit" className="conteudo-botao">
            {metricaDeHoje ? "Atualizar hoje" : "Registrar"}
          </button>
        </form>
      </div>

      <form action={excluirPostAcao} className="mb-10">
        <input type="hidden" name="id" value={post.id} />
        <button type="submit" className="conteudo-excluir">
          Excluir este post
        </button>
      </form>
    </div>
  );
}

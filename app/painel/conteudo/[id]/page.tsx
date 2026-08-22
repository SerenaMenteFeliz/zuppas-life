import { notFound } from "next/navigation";
import DadosPost from "@/components/painel/DadosPost";
import ExcluirPost from "@/components/painel/ExcluirPost";
import PostShell from "@/components/painel/PostShell";
import RoteiroEditor from "@/components/painel/RoteiroEditor";
import { carregarFalas, carregarMetricas, carregarPost } from "@/lib/conteudo";
import { statusVivo, tituloDe, type Metrica } from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";
import { salvarMetricaAcao } from "../acoes";

/* Detalhe do post: os dados, o roteiro e as métricas.

   A ordem da página é a ordem do trabalho: primeiro o que é o post, depois o
   que vai ser falado, por último o que aconteceu depois de publicar.

   `PostShell` envolve tudo porque carrega duas coisas que atravessam a tela:
   o header fixo (título e status ao vivo, estado do autosave, voltar) e a
   caixa por onde os dois editores reportam se o trabalho já foi pro banco. */

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

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bruto = await carregarPost(id);
  if (!bruto) notFound();

  /* Normaliza o status na entrada: "pronto pra gravar" foi aposentado em
     21/08 e uma linha antiga com esse valor deixaria o select sem opção
     correspondente, mostrando a primeira da lista sem avisar. */
  const post = { ...bruto, status: statusVivo(bruto.status) };

  const [falas, metricas] = await Promise.all([
    carregarFalas(id),
    carregarMetricas(id),
  ]);
  const hoje = hojeISO();

  /* Se já existe coleta de hoje, o formulário nasce preenchido com ela.

     Achado testando ao vivo (11/08): o upsert é por linha inteira, então
     registrar de novo no mesmo dia preenchendo só "views" zerava alcance,
     salvos e seguidores, perda de dado silenciosa, o oposto do que o resto
     desta seção foi desenhado pra evitar. Prefiro resolver mostrando o que já
     está gravado a fazer merge parcial escondido no servidor: assim a pessoa
     VÊ os números da coleta de hoje e corrige o que quiser, em vez de
     confiar que o app adivinhou certo. Trocar a data pra um dia passado ainda
     abre a caixa vazia; isso é limite conhecido, não descuido. */
  const metricaDeHoje = metricas.find((m) => m.coletado_em === hoje);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PostShell post={post}>
        <DadosPost post={post} />

        <div className="glass-card mb-6 p-5">
          <RoteiroEditor postId={post.id} iniciais={falas} />
        </div>

        <div className="glass-card mb-6 p-5">
          <h2
            className="mb-1 text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Métricas
          </h2>
          <p className="mb-4 text-xs" style={{ color: "var(--ink-soft)" }}>
            Uma linha por coleta, não um número só: reel continua rendendo por
            semanas, e o que interessa é a curva. Coletar de novo no mesmo dia
            corrige a linha em vez de duplicar. Entrada manual por enquanto,
            porque a API do Instagram exige conta Business ligada a uma Página,
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
                        <td key={String(c.chave)}>
                          {(m[c.chave] as number | null) ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Métrica continua com botão, e de propósito: não é texto sendo
            escrito, é um número colhido de uma vez. Autosave aqui gravaria
            leitura pela metade enquanto os dígitos ainda estão sendo digitados.

            `key` derivada dos valores: input com defaultValue é não-controlado e
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
                  defaultValue={
                    (metricaDeHoje?.[c.chave] as number | null) ?? ""
                  }
                />
              </label>
            ))}
            <button type="submit" className="conteudo-botao">
              {metricaDeHoje ? "Atualizar hoje" : "Registrar"}
            </button>
          </form>
        </div>

        {/* Excluir mora embaixo e à direita: fim da página, longe do caminho de
          quem só está escrevendo, e no canto onde a ação final costuma estar. */}
        <div className="mb-10 flex justify-end">
          <ExcluirPost
            id={post.id}
            titulo={tituloDe(post)}
            falas={falas.length}
            coletas={metricas.length}
          />
        </div>
      </PostShell>
    </div>
  );
}

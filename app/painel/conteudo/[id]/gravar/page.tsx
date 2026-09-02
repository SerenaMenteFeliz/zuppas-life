import { notFound } from "next/navigation";
import Gravacao from "@/components/painel/Gravacao";
import { carregarFalas, carregarPost } from "@/lib/conteudo";
import { statusVivo } from "@/lib/conteudo-tipos";

/* Modo gravação de um post. O desenho e o porquê moram no Gravacao.tsx; aqui
   fica só o que é do servidor: carregar post e falas, e montar a volta.

   Duas consultas e nada mais. Métricas não entram: elas respondem o que
   aconteceu DEPOIS de publicar, e ninguém olha isso com a câmera ligada. */

export const dynamic = "force-dynamic";

/* Os mesmos parâmetros de recorte que a tela do post carrega, pra que a
   corrente inteira volte inteira: lista filtrada → post → gravação → post →
   lista filtrada, do jeito que estava. Ver `DA_LISTA` na página do post, que é
   a mesma lista e pelo mesmo motivo. */
const DA_LISTA = ["v", "perfil", "mes", "semana", "janela", "ord", "q", "pag", "sd", "col"];

export default async function GravarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const busca = await searchParams;

  const qs = new URLSearchParams();
  for (const chave of DA_LISTA) {
    const v = busca[chave];
    if (typeof v === "string" && v !== "") qs.set(chave, v);
  }
  const voltarPara = "/painel/conteudo/" + id + (qs.size ? "?" + qs.toString() : "");

  const [bruto, falas] = await Promise.all([carregarPost(id), carregarFalas(id)]);
  if (!bruto) notFound();

  return (
    <Gravacao
      post={{ ...bruto, status: statusVivo(bruto.status) }}
      iniciais={falas}
      voltarPara={voltarPara}
    />
  );
}

import { NextRequest } from "next/server";
import { desmarcar, lerMarcacoes, marcacaoValida, marcar } from "@/lib/quadro";
import { CASA_COOKIE } from "@/lib/casa-chave";

/* API do Quadro da semana.

   GET é aberto: a TV da sala abre o site sozinha e não tem como digitar chave.
   O que ela lê é o que a parede já mostraria pra quem está na sala.

   POST exige a chave da casa (cookie `zl_casa`, gravado pelo middleware quando
   alguém abre /marcar?key=...). Sem isso, qualquer um que achasse a URL
   poderia marcar e desmarcar a rotina da família. */

export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio") ?? "";
  const fim = req.nextUrl.searchParams.get("fim") ?? "";
  const marcacoes = await lerMarcacoes(inicio, fim);
  if (!marcacoes) return Response.json({ erro: "não consegui ler" }, { status: 502 });
  return Response.json({ marcacoes });
}

export async function POST(req: NextRequest) {
  const chave = process.env.CASA_KEY;
  if (chave && req.cookies.get(CASA_COOKIE)?.value !== chave) {
    return Response.json({ erro: "sem a chave da casa" }, { status: 401 });
  }

  let corpo: { acao?: string; marcacao?: Record<string, unknown> };
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }
  const m = corpo.marcacao ?? {};
  if (!marcacaoValida(m)) return Response.json({ erro: "marcação inválida" }, { status: 400 });

  try {
    if (corpo.acao === "desmarcar") await desmarcar(m);
    else await marcar(m);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import {
  agendadoValido,
  agendar,
  desagendar,
  desmarcar,
  lerSemana,
  marcacaoValida,
  marcar,
} from "@/lib/quadro";
import { CASA_COOKIE } from "@/lib/casa-chave";

/* API do Quadro da semana.

   GET é aberto: a TV da sala abre o site sozinha e não tem como digitar chave.
   O que ela lê é o que a parede já mostraria pra quem está na sala.

   POST exige a chave da casa (cookie `zl_casa`, gravado pelo middleware quando
   alguém abre /marcar?key=...). Sem isso, qualquer um que achasse a URL
   poderia marcar e agendar na rotina da família. */

export async function GET(req: NextRequest) {
  const inicio = req.nextUrl.searchParams.get("inicio") ?? "";
  const fim = req.nextUrl.searchParams.get("fim") ?? "";
  const semana = await lerSemana(inicio, fim);
  if (!semana) return Response.json({ erro: "não consegui ler" }, { status: 502 });
  return Response.json(semana);
}

type Corpo = {
  acao?: "marcar" | "desmarcar" | "agendar" | "desagendar";
  marcacao?: Record<string, unknown>;
  agendado?: Record<string, unknown>;
  id?: string;
};

export async function POST(req: NextRequest) {
  const chave = process.env.CASA_KEY;
  if (chave && req.cookies.get(CASA_COOKIE)?.value !== chave) {
    return Response.json({ erro: "sem a chave da casa" }, { status: 401 });
  }

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "corpo inválido" }, { status: 400 });
  }

  try {
    switch (corpo.acao) {
      case "marcar":
      case "desmarcar": {
        const m = corpo.marcacao ?? {};
        if (!marcacaoValida(m)) return Response.json({ erro: "marcação inválida" }, { status: 400 });
        await (corpo.acao === "marcar" ? marcar(m) : desmarcar(m));
        break;
      }
      case "agendar": {
        const a = corpo.agendado ?? {};
        if (!agendadoValido(a)) return Response.json({ erro: "agendado inválido" }, { status: 400 });
        await agendar(a);
        break;
      }
      case "desagendar":
        await desagendar(corpo.id ?? "");
        break;
      default:
        return Response.json({ erro: "ação desconhecida" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ erro: e instanceof Error ? e.message : "falhou" }, { status: 500 });
  }
}

import "server-only";

import { IDS_DA_ROTINA, type Agendado, type Marcacao, type NovoAgendado } from "./quadro-itens";
import { PESSOAS, type Pessoa } from "./types";

/* Camada de dados do Quadro da semana. ÚNICO ponto do app que fala com
   `quadro_marcacoes` e `quadro_agenda`, pela mesma razão de lib/conteudo.ts e
   lib/registros.ts.

   Leitura falha em silêncio (devolve null e a tela diz que não conseguiu ler),
   escrita levanta erro: quem marcou precisa saber que não gravou. */

function rest() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url + "/rest/v1/", key };
}

function headers(key: string, extras: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
    ...extras,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function ler<T>(tabela: string, consulta: string): Promise<T[] | null> {
  const r = rest();
  if (!r) return null;
  try {
    const res = await fetch(r.url + tabela + consulta, { headers: headers(r.key), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

async function escrever(tabela: string, consulta: string, init: RequestInit): Promise<void> {
  const r = rest();
  if (!r) throw new Error("Supabase não configurado");
  const res = await fetch(r.url + tabela + consulta, {
    ...init,
    headers: headers(r.key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao gravar (${res.status}): ${await res.text()}`);
}

/** Marcações e agendados entre duas datas, inclusive. */
export async function lerSemana(
  inicio: string,
  fim: string
): Promise<{ marcacoes: Marcacao[]; agenda: Agendado[] } | null> {
  if (!ISO.test(inicio) || !ISO.test(fim)) return null;
  const faixa = `data=gte.${inicio}&data=lte.${fim}`;
  const [marcacoes, agenda] = await Promise.all([
    ler<Marcacao>("quadro_marcacoes", `?select=item,data,parte,pessoa&${faixa}`),
    ler<Agendado>(
      "quadro_agenda",
      `?select=id,titulo,data,horario,bloco,para,criado_por&${faixa}&order=data,horario`
    ),
  ]);
  if (!marcacoes || !agenda) return null;
  return { marcacoes, agenda };
}

/* ── Validação: o que vem do navegador não chega no banco sem passar aqui ── */

export function marcacaoValida(m: Partial<Marcacao>): m is Marcacao {
  if (!m.item || !m.data || m.parte !== "" || !m.pessoa) return false;
  if (!ISO.test(m.data) || !PESSOAS.includes(m.pessoa as Pessoa)) return false;
  return IDS_DA_ROTINA.has(m.item) || UUID.test(m.item);
}

export function agendadoValido(a: Partial<NovoAgendado>): a is NovoAgendado {
  if (!a.titulo || typeof a.titulo !== "string" || a.titulo.trim().length === 0) return false;
  if (a.titulo.length > 120) return false;
  if (!a.data || !ISO.test(a.data)) return false;
  if (a.horario != null && !HORA.test(a.horario)) return false;
  if (!a.bloco || !["manha", "tarde", "noite"].includes(a.bloco)) return false;
  if (!a.para || (a.para !== "Casa" && !PESSOAS.includes(a.para as Pessoa))) return false;
  if (a.criado_por != null && !PESSOAS.includes(a.criado_por)) return false;
  return true;
}

/* ── Escrita ── */

export async function marcar(m: Marcacao): Promise<void> {
  /* ignore-duplicates: marcar duas vezes a mesma coisa não é erro, é o
     mesmo clique chegando por dois caminhos (duplo toque, rede lenta). */
  await escrever("quadro_marcacoes", "?on_conflict=item,data,parte,pessoa", {
    method: "POST",
    body: JSON.stringify(m),
  });
}

export async function desmarcar(m: Marcacao): Promise<void> {
  const q =
    `?item=eq.${encodeURIComponent(m.item)}&data=eq.${m.data}` +
    `&parte=eq.${encodeURIComponent(m.parte)}&pessoa=eq.${encodeURIComponent(m.pessoa)}`;
  await escrever("quadro_marcacoes", q, { method: "DELETE" });
}

export async function agendar(a: NovoAgendado): Promise<void> {
  await escrever("quadro_agenda", "", {
    method: "POST",
    body: JSON.stringify({ ...a, titulo: a.titulo.trim() }),
  });
}

/** Apaga o agendado e as marcas dele, pra não sobrar "feito" de coisa que
    não existe mais. */
export async function desagendar(id: string): Promise<void> {
  if (!UUID.test(id)) throw new Error("id inválido");
  await escrever("quadro_marcacoes", `?item=eq.${id}`, { method: "DELETE" });
  await escrever("quadro_agenda", `?id=eq.${id}`, { method: "DELETE" });
}

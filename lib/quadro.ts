import "server-only";

import { LINHAS_QUADRO, type Marcacao } from "./quadro-itens";
import { PESSOAS, type Pessoa } from "./types";

/* Camada de dados do Quadro da semana. ÚNICO ponto do app que fala com
   `quadro_marcacoes`, pela mesma razão de lib/conteudo.ts e lib/registros.ts.

   Leitura falha em silêncio (devolve null e a tela diz que não conseguiu ler),
   escrita levanta erro: quem marcou precisa saber que não gravou. */

function rest() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url + "/rest/v1/quadro_marcacoes", key };
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

/** Marcações entre duas datas, inclusive. */
export async function lerMarcacoes(inicio: string, fim: string): Promise<Marcacao[] | null> {
  const r = rest();
  if (!r || !ISO.test(inicio) || !ISO.test(fim)) return null;
  const q = `?select=item,data,parte,pessoa&data=gte.${inicio}&data=lte.${fim}`;
  try {
    const res = await fetch(r.url + q, { headers: headers(r.key), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Marcacao[];
  } catch {
    return null;
  }
}

/** Valida o que veio do navegador contra as linhas do código. Item, parte ou
    pessoa que não existem não chegam no banco. */
export function marcacaoValida(m: Partial<Marcacao>): m is Marcacao {
  if (!m.item || !m.data || typeof m.parte !== "string" || !m.pessoa) return false;
  if (!ISO.test(m.data)) return false;
  if (!PESSOAS.includes(m.pessoa as Pessoa)) return false;
  const linha = LINHAS_QUADRO.find((l) => l.id === m.item);
  if (!linha) return false;
  const partes = linha.partes?.map((p) => p.id) ?? [""];
  return partes.includes(m.parte);
}

export async function marcar(m: Marcacao): Promise<void> {
  const r = rest();
  if (!r) throw new Error("Supabase não configurado");
  /* ignore-duplicates: marcar duas vezes a mesma coisa não é erro, é o
     mesmo clique chegando por dois caminhos (duplo toque, rede lenta). */
  const res = await fetch(r.url + "?on_conflict=item,data,parte,pessoa", {
    method: "POST",
    headers: headers(r.key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(m),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao marcar (${res.status}): ${await res.text()}`);
}

export async function desmarcar(m: Marcacao): Promise<void> {
  const r = rest();
  if (!r) throw new Error("Supabase não configurado");
  const q =
    `?item=eq.${encodeURIComponent(m.item)}&data=eq.${m.data}` +
    `&parte=eq.${encodeURIComponent(m.parte)}&pessoa=eq.${encodeURIComponent(m.pessoa)}`;
  const res = await fetch(r.url + q, {
    method: "DELETE",
    headers: headers(r.key, { Prefer: "return=minimal" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao desmarcar (${res.status}): ${await res.text()}`);
}

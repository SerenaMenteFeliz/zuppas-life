"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  COMPROMISSOS,
  ITENS,
  LISTA_CASA,
  PENDENCIAS,
} from "./dados";
import { agoraISO, hojeISO } from "./datas";
import {
  chaveConclusao,
  type Bloco,
  type Compromisso,
  type Conclusao,
  type Dono,
  type ItemCasa,
  type ItemRecorrente,
  type Pendencia,
  type PendenciaStatus,
  type Pessoa,
  type TipoConclusao,
} from "./types";

/* Estado do Zuppas Life.

   Este arquivo é **a costura da fase 2**. Hoje ele guarda em `localStorage`;
   quando o projeto Supabase existir, só as funções deste módulo mudam e
   nenhuma tela é tocada. Foi escrito assim de propósito: a auditoria de 24/07
   achou o app inteiro sem persistência nenhuma (marcava a âncora, recarregava,
   sumia), e a família não pode ficar esperando o banco pra começar a usar.

   Limite honesto do `localStorage`, que precisa ficar escrito porque muda o
   que dá pra concluir do app hoje: **o estado é por aparelho**. Se a Liz marca
   a âncora no celular dela, a TV da sala não fica sabendo. Isso não é bug, é o
   teto desta fase, e é exatamente o que o Supabase resolve.

   O que é persistido e o que não é:
   - conclusões, compromissos, lista da casa e status de pendência: persistidos
   - definição das rotinas (`ITENS`): não. A regra da casa vive no código e no
     vault, e mudar rotina é decisão de família, não toque de tela */

const CHAVE = "zuppas-life";

/** Sobe quando o formato do que é gravado muda de forma incompatível. O que
    estiver gravado em versão antiga é descartado em vez de ser migrado na
    marra, que é como se perde dado sem perceber. */
const VERSAO = 1;

export interface Estado {
  eu: Pessoa;
  itens: ItemRecorrente[];
  conclusoes: Conclusao[];
  compromissos: Compromisso[];
  lista: ItemCasa[];
  pendencias: Pendencia[];
}

/** Só isto vai pro disco. As pendências entram como sobreposição de status,
    não como cópia inteira: assim o texto delas continua vindo do código (que
    espelha o vault) mesmo depois de alguém marcar uma como concluída. */
interface Persistido {
  versao: number;
  eu: Pessoa;
  conclusoes: Conclusao[];
  compromissos: Compromisso[];
  lista: ItemCasa[];
  statusPendencias: Record<string, { status: PendenciaStatus; atualizado: string }>;
  pendenciasNovas: Pendencia[];
}

function inicial(): Estado {
  return {
    eu: "Liz",
    itens: ITENS,
    conclusoes: [],
    compromissos: COMPROMISSOS,
    lista: LISTA_CASA,
    pendencias: PENDENCIAS,
  };
}

let estado: Estado = inicial();
let hidratado = false;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const o of ouvintes) o();
}

function mudar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  gravar();
  notificar();
}

/* ── Persistência ────────────────────────────────────────────────────────── */

function gravar() {
  if (typeof window === "undefined") return;
  const statusPendencias: Persistido["statusPendencias"] = {};
  const novas: Pendencia[] = [];
  const semente = new Set(PENDENCIAS.map((p) => p.id));
  for (const p of estado.pendencias) {
    if (semente.has(p.id)) {
      statusPendencias[p.id] = { status: p.status, atualizado: p.atualizado };
    } else {
      novas.push(p);
    }
  }

  const dados: Persistido = {
    versao: VERSAO,
    eu: estado.eu,
    conclusoes: estado.conclusoes,
    compromissos: estado.compromissos,
    lista: estado.lista,
    statusPendencias,
    pendenciasNovas: novas,
  };

  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* Cota cheia ou modo privado. Perder a gravação é ruim, derrubar a tela da
       família por causa disso é pior. */
  }
}

/** Lê o disco uma vez, depois da montagem. Nunca durante a renderização: o
    servidor não tem `localStorage` e um estado diferente na hidratação quebra
    a árvore inteira. */
function hidratar() {
  if (hidratado || typeof window === "undefined") return;
  hidratado = true;

  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE);
  } catch {
    return;
  }
  if (!bruto) return;

  try {
    const dados = JSON.parse(bruto) as Persistido;
    if (dados.versao !== VERSAO) return;

    const pendencias = PENDENCIAS.map((p) => {
      const salvo = dados.statusPendencias?.[p.id];
      return salvo ? { ...p, ...salvo } : p;
    }).concat(dados.pendenciasNovas ?? []);

    estado = {
      ...estado,
      eu: dados.eu ?? estado.eu,
      conclusoes: dados.conclusoes ?? [],
      compromissos: dados.compromissos ?? COMPROMISSOS,
      lista: dados.lista ?? LISTA_CASA,
      pendencias,
    };
    notificar();
  } catch {
    /* JSON corrompido: fica com a semente, que é sempre válida. */
  }
}

/* ── Leitura ─────────────────────────────────────────────────────────────── */

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function ler() {
  return estado;
}

/** Estado do app. Serve servidor e cliente com a mesma semente, e só depois de
    montar é que o disco entra. */
export function useZuppas(): Estado {
  const atual = useSyncExternalStore(assinar, ler, ler);
  useEffect(() => {
    hidratar();
  }, []);
  return atual;
}

/** "Hoje" reativo.

    Não é `new Date()` na tela: é a data de Ubatuba, revalidada de minuto em
    minuto. O minuto existe pela TV, que fica ligada a noite inteira: sem isso
    ela amanhece mostrando o dia anterior, e uma parede que mente uma vez perde
    a confiança da casa pra sempre. */
export function useHoje(): string {
  const [dia, setDia] = useState(hojeISO);
  useEffect(() => {
    const id = setInterval(() => setDia(hojeISO()), 60_000);
    return () => clearInterval(id);
  }, []);
  return dia;
}

/* ── Ações ───────────────────────────────────────────────────────────────────
   Toda escrita do app passa por aqui. Na fase 2, cada uma vira um `insert` ou
   `update` no Supabase e o resto do app não muda. */

export function definirPessoa(pessoa: Pessoa) {
  mudar({ eu: pessoa });
}

/** Resolve uma ocorrência do dia como feita ou pulada.

    Um clique só cicla entre os três estados quando `tipo` não é informado, e
    vai direto pro estado pedido quando é. Idempotente pela chave `id|data`:
    marcar duas vezes não cria duas linhas, e marcar de dois aparelhos
    diferentes converge no mesmo registro quando o banco entrar. */
export function resolver(
  itemId: string,
  data: string,
  pessoa: Pessoa,
  tipo: TipoConclusao = "feito"
) {
  const chave = chaveConclusao(itemId, data);
  const atual = estado.conclusoes.find((c) => c.chave === chave);

  /* Repetir o mesmo estado desfaz. É como uma pessoa espera que um botão de
     marcar se comporte, e evita ter que caçar um "desmarcar" separado. */
  if (atual && atual.tipo === tipo) {
    mudar({ conclusoes: estado.conclusoes.filter((c) => c.chave !== chave) });
    return;
  }

  const nova: Conclusao = {
    chave,
    itemId,
    data,
    pessoa,
    feitoEm: agoraISO(),
    tipo,
  };
  mudar({
    conclusoes: [...estado.conclusoes.filter((c) => c.chave !== chave), nova],
  });
}

/** Atalho antigo, mantido porque metade das telas só quer marcar feito. */
export function alternarConclusao(itemId: string, data: string, pessoa: Pessoa) {
  resolver(itemId, data, pessoa, "feito");
}

export function pular(itemId: string, data: string, pessoa: Pessoa) {
  resolver(itemId, data, pessoa, "pulado");
}

export function agendar(entrada: {
  titulo: string;
  detalhe?: string;
  data: string;
  horario?: string;
  bloco: Bloco;
  para: Dono;
  tipo: "compromisso" | "lembrete";
  criadoPor: Pessoa;
}) {
  const novo: Compromisso = { id: novoId("k"), ...entrada };
  mudar({ compromissos: [...estado.compromissos, novo] });
  return novo;
}

export function desagendar(id: string) {
  mudar({
    compromissos: estado.compromissos.filter((c) => c.id !== id),
    conclusoes: estado.conclusoes.filter((c) => c.itemId !== id),
  });
}

export function adicionarNaLista(titulo: string, por: Pessoa) {
  const item: ItemCasa = {
    id: novoId("l"),
    titulo,
    por,
    feito: false,
    criadoEm: hojeISO(),
  };
  mudar({ lista: [...estado.lista, item] });
}

export function alternarItemDaLista(id: string) {
  mudar({
    lista: estado.lista.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)),
  });
}

export function removerDaLista(id: string) {
  mudar({ lista: estado.lista.filter((i) => i.id !== id) });
}

/** Tira da lista tudo que já foi comprado. Depois do mercado, a lista limpa é
    o que faz alguém escrever a próxima. */
export function limparComprados() {
  mudar({ lista: estado.lista.filter((i) => !i.feito) });
}

export function mudarStatusPendencia(id: string, status: PendenciaStatus) {
  mudar({
    pendencias: estado.pendencias.map((p) =>
      p.id === id ? { ...p, status, atualizado: hojeISO() } : p
    ),
  });
}

export function adicionarPendencia(entrada: {
  titulo: string;
  projeto: string;
  responsavel: Pessoa;
  nota?: string;
  prazo?: string;
}) {
  const nova: Pendencia = {
    id: novoId("d"),
    status: "aberta",
    atualizado: hojeISO(),
    ...entrada,
  };
  mudar({ pendencias: [...estado.pendencias, nova] });
}

/** Apaga tudo que foi gravado neste aparelho e volta pra semente do vault. */
export function reiniciar() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* nada a fazer */
  }
  estado = inicial();
  notificar();
}

let contador = 0;
function novoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}-${contador}`;
}

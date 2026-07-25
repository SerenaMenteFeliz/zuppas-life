import type {
  Compromisso,
  ItemCasa,
  ItemRecorrente,
  NumeroNegocio,
  Pendencia,
} from "./types";

/* Dado semente do Zuppas Life.

   Não é placeholder: tudo aqui foi extraído do Vault Zuppas, das notas que já
   são fonte de verdade hoje. As rotinas e tarefas de casa vêm de
   [[Rotina - Família (Semana 1)]], que estava escrita desde 16/06 e nunca
   tinha entrado no app. As pendências vêm de `memoria-negocio.md` e do
   `Painel - Hoje.md`.

   Isto é a semente, não o estado. O que a família marca é gravado por cima
   (ver `store.ts`), e na fase 2 esta constante vira o `seed` de uma migration
   do Supabase, não some. */

/* ── Itens recorrentes ────────────────────────────────────────────────────── */

/** Data em que as aulas voltam.

    A [[Rotina - Família (Semana 1)]] diz "férias escolares até final de julho"
    e nunca registrou o dia exato. Esta data é uma estimativa e existe uma
    pendência aberta pra confirmar com a escola (ver `p22` abaixo). Enquanto
    não for confirmada, os itens de escola só aparecem a partir daqui. */
export const VOLTA_AS_AULAS = "2026-07-27";

export const ITENS: ItemRecorrente[] = [
  /* ── Âncoras ────────────────────────────────────────────────────────────
     "O dia conta como ✅ se as 3 âncoras forem cumpridas." A regra existe
     porque a Akiane é autista e o dia vai ser interrompido: âncoras curtas
     acontecem mesmo nos dias ruins, e um dia salvo no caos ainda conta. */
  {
    id: "a1",
    titulo: "Alongamento ao acordar",
    detalhe: "Todos menos a Akiane. Camilla se acordar cedo",
    categoria: "ancora",
    bloco: "manha",
    horario: "07:00",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: true,
    exceto: ["Akiane"],
    vaultNota: "Rotina - Família (Semana 1)",
  },
  {
    id: "a2",
    titulo: "Meditação guiada pela Liz",
    detalhe: "Hábito novo. Pratica pras gravações e co-regula a Akiane",
    categoria: "ancora",
    bloco: "manha",
    horario: "07:30",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: true,
    vaultNota: "Rotina - Família (Semana 1)",
  },
  {
    id: "a3",
    titulo: "Comer pelo cardápio",
    detalhe: "Foco no almoço, marmitas da semana",
    categoria: "ancora",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: true,
    vaultNota: "Rotina - Família (Semana 1)",
  },

  /* ── Biro ───────────────────────────────────────────────────────────────
     3 a 4 passeios por dia, dono por turno. É o item mais recorrente e mais
     binário da casa, e o que mais gera "achei que você tinha levado". */
  {
    id: "b1",
    titulo: "Biro, passeio da manhã",
    categoria: "biro",
    bloco: "manha",
    recorrencia: { tipo: "diario" },
    dono: "Liz",
    ancora: false,
  },
  {
    id: "b2",
    titulo: "Biro, passeio da tarde",
    categoria: "biro",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "André",
    ancora: false,
  },
  {
    id: "b3",
    titulo: "Biro, passeio da noite",
    detalhe: "Yan, Ge e Camilla juntos",
    categoria: "biro",
    bloco: "noite",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },

  /* ── Escola ─────────────────────────────────────────────────────────────
     Horários confirmados em 30/06. Só valem a partir da volta às aulas. */
  {
    id: "e1",
    titulo: "André sai pra escola",
    detalhe: "Sai andando ~6:35, entra 6:50",
    categoria: "escola",
    bloco: "manha",
    horario: "06:35",
    recorrencia: { tipo: "dias-uteis" },
    dono: "André",
    ancora: false,
    valeDe: VOLTA_AS_AULAS,
  },
  {
    id: "e2",
    titulo: "Liz leva a Akiane",
    detalhe: "Escola na rua de casa. Entra entre 7:30 e 7:40",
    categoria: "escola",
    bloco: "manha",
    horario: "07:25",
    recorrencia: { tipo: "dias-uteis" },
    dono: "Liz",
    ancora: false,
    envolve: ["Akiane"],
    valeDe: VOLTA_AS_AULAS,
  },
  {
    id: "e3",
    titulo: "Buscar a Akiane",
    detalhe: "Variável: crise pode antecipar. Liz fica na escola se a acompanhante faltar",
    categoria: "escola",
    bloco: "manha",
    horario: "11:50",
    recorrencia: { tipo: "dias-uteis" },
    dono: "Liz",
    ancora: false,
    envolve: ["Akiane"],
    valeDe: VOLTA_AS_AULAS,
  },
  {
    id: "e4",
    titulo: "André volta da escola",
    categoria: "escola",
    bloco: "tarde",
    horario: "14:00",
    recorrencia: { tipo: "dias-uteis" },
    dono: "André",
    ancora: false,
    valeDe: VOLTA_AS_AULAS,
  },

  /* ── Casa ───────────────────────────────────────────────────────────────
     Donos fixos e rodízios, exatamente como decidido em 16/06. O rodízio de
     varrer/pano e banheiros existe pra tirar isso da Liz, que está
     sobrecarregada nessa parte. */
  {
    id: "c1",
    titulo: "Cozinhar",
    detalhe: "Liz, Camilla e Ge se ajudando",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "Liz",
    ancora: false,
  },
  {
    id: "c2",
    titulo: "Louça",
    categoria: "casa",
    bloco: "noite",
    recorrencia: { tipo: "diario" },
    dono: "André",
    ancora: false,
  },
  {
    id: "c3",
    titulo: "Lixo",
    detalhe: "Quando encher. A meta é virar autônomo, sem lembrar",
    categoria: "casa",
    bloco: "noite",
    recorrencia: { tipo: "diario" },
    dono: "André",
    ancora: false,
  },
  {
    id: "c4",
    titulo: "Varrer e passar pano",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "semanal", dias: [1, 4] },
    dono: "Casa",
    rodizio: ["Yan", "Ge", "Camilla"],
    ancora: false,
  },
  {
    id: "c5",
    titulo: "Banheiros (2)",
    detalhe: "Independente do dia de varrer",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "semanal", dias: [6] },
    dono: "Casa",
    rodizio: ["Yan", "Ge", "Camilla"],
    ancora: false,
  },
  {
    id: "c6",
    titulo: "Roupa",
    detalhe: "André ajuda",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "semanal", dias: [2] },
    dono: "Liz",
    ancora: false,
  },
  {
    id: "c7",
    titulo: "Organização geral",
    detalhe: "Cada um guarda o seu. Não deixar coisa espalhada",
    categoria: "casa",
    bloco: "noite",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "c8",
    titulo: "Mercado da semana",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "semanal", dias: [5] },
    dono: "Yan",
    ancora: false,
  },
  {
    id: "c9",
    titulo: "Produção das marmitas",
    detalhe: "Seguindo o cardápio da Liz",
    categoria: "casa",
    bloco: "manha",
    recorrencia: { tipo: "semanal", dias: [0] },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "c10",
    titulo: "Deixar a casa pronta pra segunda",
    categoria: "casa",
    bloco: "noite",
    recorrencia: { tipo: "semanal", dias: [0] },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "c11",
    titulo: "30 min juntos pra alinhar a semana",
    categoria: "casa",
    bloco: "noite",
    recorrencia: { tipo: "semanal", dias: [0] },
    dono: "Casa",
    ancora: false,
    vaultNota: "Rotina - Família (Semana 1)",
  },

  /* ── Camada plena, dias bons ────────────────────────────────────────────
     A rotina tem duas camadas de propósito. Esta é a de cima: se o dia foi
     ruim, ela não acontece e o dia ainda conta pelas âncoras. */
  {
    id: "p1",
    titulo: "Corrida",
    detalhe: "Camada plena. Se o dia foi difícil, pula sem culpa",
    categoria: "pessoal",
    bloco: "manha",
    recorrencia: { tipo: "semanal", dias: [2, 5] },
    dono: "Casa",
    ancora: false,
  },
];

/* ── Pendências ─────────────────────────────────────────────────────────────
   As 21 reais do vault, mais a de confirmar a volta às aulas. `atualizado` é
   o que alimenta o "parada há N dias": era gravado e nunca mostrado. */

export const PENDENCIAS: Pendencia[] = [
  { id: "d1", projeto: "Lar Interior", titulo: "Revisar a copy da landing page", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04", vaultNota: "Lar Interior - Visão Geral" },
  { id: "d2", projeto: "Lar Interior", titulo: "Editar as fotos de Ubatuba e subir na landing", status: "aberta", responsavel: "Liz", nota: "Fotos tiradas em 28/06", atualizado: "2026-06-28" },
  { id: "d3", projeto: "Lar Interior", titulo: "Trocar os links das bios pro domínio novo", status: "aberta", responsavel: "Yan", nota: "larinterior.serenamentefeliz.com no ar desde 20/07", atualizado: "2026-07-20" },
  { id: "d4", projeto: "Lar Interior", titulo: "Automação de boas-vindas no Brevo e hard bounce", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d5", projeto: "Lar Interior", titulo: "Definir a sequência de aquecimento no Brevo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d6", projeto: "Lar Interior", titulo: "Instrumentar o PostHog na landing", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d7", projeto: "Lar Interior", titulo: "Revisar e aprovar os 5 roteiros de Reels", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "d8", projeto: "Lar Interior", titulo: "Gravar as 7 aulas do Desafio", status: "aberta", responsavel: "Liz", nota: "Cenários de natureza, Ubatuba", atualizado: "2026-06-20", vaultNota: "Lar Interior - Estrutura das Aulas" },
  { id: "d9", projeto: "Lar Interior", titulo: "Gravar os bônus (meditação, SOS, rastreador)", status: "aberta", responsavel: "Liz", atualizado: "2026-06-20" },
  { id: "d10", projeto: "Lar Interior", titulo: "Escrever o texto da Carta do Dia 14", status: "aberta", responsavel: "Liz", nota: "O mecanismo já está pronto no app", atualizado: "2026-07-12" },

  { id: "d11", projeto: "Método Cálice", titulo: "Validar o conteúdo do quiz (8 perguntas, 4 resultados)", status: "aberta", responsavel: "Ge", nota: "O quiz já está público e testado. Falta só o aval", atualizado: "2026-07-20", prazo: "2026-07-26", vaultNota: "Quiz Diagnóstico - Estrutura e Copy" },
  { id: "d12", projeto: "Método Cálice", titulo: "Gravar áudios (dias 3, 5, 9) e vídeo (dia 7)", status: "aberta", responsavel: "Ge", atualizado: "2026-07-08", vaultNota: "Método Cálice - Visão Geral" },

  { id: "d13", projeto: "App Serena", titulo: "Integrar o Asaas (webhook de pagamento)", status: "em-andamento", responsavel: "Yan", nota: "Sem ele não dá pra vender", atualizado: "2026-07-20", bloqueio: true, vaultNota: "App - Backlog Técnico e Funcionalidades" },
  { id: "d14", projeto: "App Serena", titulo: "Aplicar a migration 0006 (notas do Cálice e diário)", status: "aberta", responsavel: "Yan", nota: "Destrava 2 recursos que hoje ficam ocultos", atualizado: "2026-07-12" },
  { id: "d15", projeto: "App Serena", titulo: "Criar projeto no PostHog e colar a chave", status: "aberta", responsavel: "Yan", nota: "O código já está instrumentado, roda como no-op sem a chave", atualizado: "2026-07-12" },
  { id: "d16", projeto: "App Serena", titulo: "Definir a data de lançamento", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },

  { id: "d17", projeto: "Consciente Momento", titulo: "Definir banco de imagens alinhado ao Serena", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },
  { id: "d18", projeto: "Consciente Momento", titulo: "Preencher as métricas do 1º post", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22", vaultNota: "Registro de Conteúdo" },

  { id: "d19", projeto: "TikTok", titulo: "Mapear o produto próprio da Camilla", status: "aberta", responsavel: "Camilla", nota: "Satélite de tráfego ainda não mapeado", atualizado: "2026-07-08" },

  { id: "d20", projeto: "Família", titulo: "Reagendar a revisão da rotina com todos", status: "bloqueada", responsavel: "Yan", nota: "Estava marcada pra 17/06", atualizado: "2026-06-17", vaultNota: "Rotina - Família (Semana 1)" },
  { id: "d21", projeto: "Família", titulo: "Escolher o fim de semana da próxima trilha", status: "aberta", responsavel: "André", atualizado: "2026-07-14" },
  { id: "d22", projeto: "Família", titulo: "Confirmar com a escola a data da volta às aulas", status: "aberta", responsavel: "Liz", nota: "O app assume 27/07 até ser confirmado. Os horários de escola só aparecem a partir dessa data", atualizado: "2026-07-24" },
];

/* ── Compromissos e lembretes ───────────────────────────────────────────────
   Semente curta de propósito: só o que existe de fato no vault. O resto a
   família agenda pela tela, que é justamente o ponto da funcionalidade. */

export const COMPROMISSOS: Compromisso[] = [
  {
    id: "k1",
    titulo: "Ge dar o aval do quiz",
    data: "2026-07-26",
    bloco: "tarde",
    para: "Ge",
    tipo: "lembrete",
  },
  {
    id: "k2",
    titulo: "Review semanal do vault",
    data: "2026-07-26",
    horario: "20:00",
    bloco: "noite",
    para: "Yan",
    tipo: "compromisso",
  },
  {
    id: "k3",
    titulo: "Reunião de rotina com a família",
    detalhe: "Revisar a Semana 1 e escolher a data de início. Atrasado desde 17/06",
    data: "2026-07-26",
    horario: "19:00",
    bloco: "noite",
    para: "Casa",
    tipo: "compromisso",
  },
];

/* ── Lista da casa ───────────────────────────────────────────────────────── */

export const LISTA_CASA: ItemCasa[] = [
  { id: "l1", titulo: "Café", por: "Liz", feito: false, criadoEm: "2026-07-22" },
  { id: "l2", titulo: "Fruta pra semana", por: "Ge", feito: false, criadoEm: "2026-07-22" },
  { id: "l3", titulo: "Pilha do controle", por: "Yan", feito: true, criadoEm: "2026-07-20" },
];

/* ── Números do negócio ─────────────────────────────────────────────────────
   Mockado. Na fase 2 vira leitura agregada do Supabase do serena-app: só o
   contador atravessa, nunca as linhas de lead. */

export const NUMEROS: NumeroNegocio[] = [
  { rotulo: "Leads Lar Interior", valor: 0, detalhe: "desde 20/07" },
  { rotulo: "Leads do quiz", valor: 0, detalhe: "Método Cálice" },
];

export const CITACOES: string[] = [
  "A casa se constrói no que se repete.",
  "Devagar é a velocidade que dura.",
  "O que está escrito não precisa ser lembrado.",
  "Um dia de cada vez, e o dia inteiro.",
  "Um dia salvo no caos ainda conta.",
];

/** Vault de origem, pro link `obsidian://` das notas. */
export const VAULT = "Vault Zuppas";

export function linkDoVault(nota: string): string {
  return `obsidian://open?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(nota)}`;
}

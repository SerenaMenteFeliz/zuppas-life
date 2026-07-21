import type {
  ItemCasa,
  Lembrete,
  NumeroNegocio,
  Pendencia,
  Rotina,
} from "./types";

/* Dado real extraído do Vault Zuppas (memoria-negocio.md, Painel - Hoje.md,
   Rotina - Família), atualizado em 20/07/2026. Não é placeholder: serve de
   base direta pra migração quando o schema for pro Supabase.

   As 46 tasks do Vault Appyon que existiam aqui saíram — decisão de 19/07,
   a Appyon está fora do escopo do Zuppas Life. */

/* ── Rotina ────────────────────────────────────────────────────────────────
   As 3 âncoras são o que define se o dia contou. Ver [[Rotina - Família]]. */
export const ROTINAS: Rotina[] = [
  {
    id: "r1",
    titulo: "Alongamento ao acordar",
    responsavel: "Casa",
    horario: "07:00",
    ancora: true,
  },
  {
    id: "r2",
    titulo: "Meditação guiada pela Liz",
    responsavel: "Casa",
    horario: "07:30",
    ancora: true,
  },
  {
    id: "r3",
    titulo: "Comer pelo cardápio",
    responsavel: "Casa",
    ancora: true,
  },
];

/* Dias em que a casa fechou as 3 âncoras, mais recente primeiro.
   Mockado pra o componente de constância ter o que mostrar — a rotina real
   ainda não foi iniciada (revisão com a família segue pendente). */
export const DIAS_FECHADOS = 4;

/* ── Pendências ────────────────────────────────────────────────────────── */
export const PENDENCIAS: Pendencia[] = [
  // Lar Interior — landing / captura
  { id: "p1", projeto: "Lar Interior", titulo: "Revisar a copy da landing page", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "p2", projeto: "Lar Interior", titulo: "Editar as fotos de Ubatuba e subir na landing", status: "aberta", responsavel: "Liz", nota: "Fotos tiradas em 28/06", atualizado: "2026-06-28" },
  { id: "p3", projeto: "Lar Interior", titulo: "Trocar os links das bios pro domínio novo", status: "aberta", responsavel: "Yan", nota: "larinterior.serenamentefeliz.com no ar desde 20/07", atualizado: "2026-07-20" },
  { id: "p4", projeto: "Lar Interior", titulo: "Automação de boas-vindas no Brevo + hard bounce", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "p5", projeto: "Lar Interior", titulo: "Definir a sequência de aquecimento no Brevo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "p6", projeto: "Lar Interior", titulo: "Instrumentar PostHog na landing", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },

  // Lar Interior — conteúdo
  { id: "p7", projeto: "Lar Interior", titulo: "Revisar e aprovar os 5 roteiros de Reels", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "p8", projeto: "Lar Interior", titulo: "Gravar as 7 aulas do Desafio", status: "aberta", responsavel: "Liz", nota: "Cenários de natureza, Ubatuba", atualizado: "2026-06-20" },
  { id: "p9", projeto: "Lar Interior", titulo: "Gravar os bônus (meditação, SOS, rastreador)", status: "aberta", responsavel: "Liz", atualizado: "2026-06-20" },
  { id: "p10", projeto: "Lar Interior", titulo: "Escrever o texto da Carta do Dia 14", status: "aberta", responsavel: "Liz", nota: "Mecanismo já pronto no app", atualizado: "2026-07-12" },

  // Método Cálice
  { id: "p11", projeto: "Método Cálice", titulo: "Validar o conteúdo do quiz (8 perguntas, 4 resultados)", status: "aberta", responsavel: "Ge", nota: "Quiz já está público e testado — falta só o aval", atualizado: "2026-07-20", prazo: "2026-07-23" },
  { id: "p12", projeto: "Método Cálice", titulo: "Gravar áudios (dias 3, 5, 9) e vídeo (dia 7)", status: "aberta", responsavel: "Ge", atualizado: "2026-07-08" },

  // App Serena Mente Feliz
  { id: "p13", projeto: "App Serena", titulo: "Integrar o Asaas (webhook de pagamento)", status: "em-andamento", responsavel: "Yan", nota: "Único bloqueio real de lançamento", atualizado: "2026-07-20" },
  { id: "p14", projeto: "App Serena", titulo: "Aplicar a migration 0006 (notas do Cálice + diário)", status: "aberta", responsavel: "Yan", atualizado: "2026-07-12" },
  { id: "p15", projeto: "App Serena", titulo: "Criar projeto no PostHog e colar a chave", status: "aberta", responsavel: "Yan", atualizado: "2026-07-12" },
  { id: "p16", projeto: "App Serena", titulo: "Definir a data de lançamento", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },

  // Consciente Momento
  { id: "p17", projeto: "Consciente Momento", titulo: "Definir banco de imagens alinhado ao Serena", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },
  { id: "p18", projeto: "Consciente Momento", titulo: "Preencher as métricas do 1º post", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },

  // Camilla
  { id: "p19", projeto: "TikTok", titulo: "Mapear o produto próprio da Camilla", status: "aberta", responsavel: "Camilla", nota: "Satélite de tráfego ainda não mapeado", atualizado: "2026-07-08" },

  // Família
  { id: "p20", projeto: "Família", titulo: "Reagendar a revisão da rotina com todos", status: "bloqueada", responsavel: "Yan", nota: "Estava marcada pra 17/06", atualizado: "2026-06-17" },
  { id: "p21", projeto: "Família", titulo: "Escolher o fim de semana da próxima trilha", status: "aberta", responsavel: "André", atualizado: "2026-07-14" },
];

/* A frase que fica na parede até alguém resolver. Uma só, sempre. */
export const BLOQUEIO_DA_VEZ = {
  titulo: "O lançamento depende do webhook do Asaas",
  detalhe: "É o último bloqueio técnico. Sem ele não dá pra vender.",
  responsavel: "Yan" as const,
};

/* ── Lembretes ─────────────────────────────────────────────────────────── */
export const LEMBRETES: Lembrete[] = [
  { id: "l1", titulo: "Ge dar o aval do quiz", quando: "2026-07-23", para: "Ge" },
  { id: "l2", titulo: "Review semanal do vault", quando: "2026-07-26", para: "Yan" },
];

/* ── Lista da casa ─────────────────────────────────────────────────────── */
export const LISTA_CASA: ItemCasa[] = [
  { id: "c1", titulo: "Café", por: "Liz", feito: false },
  { id: "c2", titulo: "Fruta pra semana", por: "Ge", feito: false },
  { id: "c3", titulo: "Pilha do controle", por: "Yan", feito: true },
];

/* ── Números do negócio ────────────────────────────────────────────────────
   Mockado. Na fase de infra vira leitura agregada do Supabase do serena-app:
   só o contador atravessa, nunca as linhas de lead. */
export const NUMEROS: NumeroNegocio[] = [
  { rotulo: "Leads Lar Interior", valor: 0, detalhe: "desde 20/07" },
  { rotulo: "Leads do quiz", valor: 0, detalhe: "Método Cálice" },
  { rotulo: "Dias de rotina", valor: DIAS_FECHADOS, detalhe: "seguidos" },
];

/* Citação rotativa — o card de citação já existe na linguagem do serena-app. */
export const CITACOES: string[] = [
  "A casa se constrói no que se repete.",
  "Devagar é a velocidade que dura.",
  "O que está escrito não precisa ser lembrado.",
  "Um dia de cada vez, e o dia inteiro.",
];

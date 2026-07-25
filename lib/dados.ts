import type { Compromisso, ItemCasa, ItemRecorrente, Pendencia } from "./types";

/* Dado semente do Zuppas Life.

   Não é placeholder: tudo aqui foi extraído do Vault Zuppas, das notas que já
   são fonte de verdade hoje. As rotinas e tarefas de casa vêm de
   [[Rotina - Família (Semana 1)]], que estava escrita desde 16/06 e nunca
   tinha entrado no app. As pendências vêm de `memoria-negocio.md` e do
   `Painel - Hoje.md`.

   Revisado item por item com o Yan em 25/07/2026. Duas coisas saíram daqui por
   serem invenção minha e não dado da família (uma tarefa de trilha atribuída ao
   André e uma data de reunião de rotina): palpite com cara de dado real é pior
   que campo vazio num painel que a casa vai usar pra se organizar.

   Isto é a semente, não o estado. O que a família marca é gravado por cima
   (ver `store.ts`), e na fase 2 esta constante vira o `seed` de uma migration
   do Supabase, não some. */

/* ── Itens recorrentes ────────────────────────────────────────────────────── */

/** Volta às aulas, confirmada pelo Yan em 25/07/2026.

    São duas datas, não uma. O André volta uma semana antes da Akiane, e tratar
    isso como uma data só faria a Liz ver na tela dela, já na primeira segunda,
    dois horários de escola quando ela só tem um. */
export const VOLTA_ANDRE = "2026-07-27";
export const VOLTA_AKIANE = "2026-08-03";

export const ITENS: ItemRecorrente[] = [
  /* ── Âncoras ────────────────────────────────────────────────────────────
     "O dia conta como ✅ se as 3 âncoras forem cumpridas." A regra existe
     porque a Akiane é autista e o dia vai ser interrompido: âncoras curtas
     acontecem mesmo nos dias ruins, e um dia salvo no caos ainda conta. */
  {
    id: "a1",
    titulo: "Alongamento ao acordar",
    categoria: "ancora",
    bloco: "manha",
    horario: "07:00",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: true,
    akiane: true,
    vaultNota: "Rotina - Família (Semana 1)",
  },
  {
    /* Sem bloco de propósito (25/07): precisa acontecer todo dia e não precisa
       acontecer de manhã. Cai na faixa "a qualquer hora". */
    id: "a2",
    titulo: "Meditação guiada pela Liz",
    detalhe: "Quando der no dia. Pratica pras gravações e co-regula a Akiane",
    categoria: "ancora",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: true,
    akiane: true,
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
    akiane: true,
    vaultNota: "Rotina - Família (Semana 1)",
  },

  /* ── Biro ───────────────────────────────────────────────────────────────
     Quatro por dia, e não três: ele bebe muita água (Yan, 25/07). Todos no
     mural, porque este é o item que mais gera "achei que você tinha levado" e
     é exatamente pra isso que existe o "peguei". */
  {
    id: "b1",
    titulo: "Biro, manhã",
    categoria: "biro",
    bloco: "manha",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "b2",
    titulo: "Biro, depois do almoço",
    categoria: "biro",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "b3",
    titulo: "Biro, fim da tarde",
    categoria: "biro",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "b4",
    titulo: "Biro, noite",
    categoria: "biro",
    bloco: "noite",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },

  /* ── Escola ─────────────────────────────────────────────────────────────
     Horários confirmados em 30/06, datas de volta confirmadas em 25/07. O
     André é levado e buscado pela casa; a Akiane é com a Liz. */
  {
    id: "e1",
    titulo: "Levar o André na escola",
    detalhe: "Entra 6:50",
    categoria: "escola",
    bloco: "manha",
    horario: "06:35",
    recorrencia: { tipo: "dias-uteis" },
    dono: "Casa",
    envolve: ["André"],
    ancora: false,
    valeDe: VOLTA_ANDRE,
  },
  {
    id: "e4",
    titulo: "Buscar o André",
    categoria: "escola",
    bloco: "tarde",
    horario: "14:00",
    recorrencia: { tipo: "dias-uteis" },
    dono: "Casa",
    envolve: ["André"],
    ancora: false,
    valeDe: VOLTA_ANDRE,
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
    akiane: true,
    valeDe: VOLTA_AKIANE,
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
    akiane: true,
    valeDe: VOLTA_AKIANE,
  },

  /* ── Casa ───────────────────────────────────────────────────────────────
     Mural, decidido em 25/07: tarefa de casa não tem nome antes de acontecer,
     e quem marcar pegou aquela. O rodízio semanal de varrer e banheiro entre
     Yan, Ge e Camilla, que vinha de 16/06, foi desligado aqui: escala fixa só
     funciona quando a semana de todo mundo é igual.

     A exceção é o André, que fica com louça e lixo. Os dois no bloco da tarde,
     porque a noite dele muda quando as aulas voltam. */
  {
    id: "c1",
    titulo: "Cozinhar",
    detalhe: "Segue o cardápio da Liz",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "Casa",
    ancora: false,
  },
  {
    id: "c2",
    titulo: "Louça",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "diario" },
    dono: "André",
    ancora: false,
  },
  {
    id: "c3",
    titulo: "Lixo",
    detalhe: "Quando encher. A meta é virar autônomo, sem lembrar",
    categoria: "casa",
    bloco: "tarde",
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
    ancora: false,
  },
  {
    id: "c6",
    titulo: "Roupa",
    categoria: "casa",
    bloco: "tarde",
    recorrencia: { tipo: "semanal", dias: [2] },
    dono: "Casa",
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
    dono: "Casa",
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

  /* ── O dia da Akiane ────────────────────────────────────────────────────
     Pouca coisa fixa, por pedido do Yan em 25/07. A sequência dela é
     principalmente as âncoras (que ela faz junto com a casa) e a escola. Estes
     dois existem porque uma agenda visual precisa ter o que a criança
     reconhece como dela, não só o que os adultos combinaram. */
  {
    id: "ak1",
    titulo: "Brincar",
    categoria: "pessoal",
    recorrencia: { tipo: "diario" },
    dono: "Akiane",
    ancora: false,
    akiane: true,
  },
  {
    id: "ak2",
    titulo: "Ajudar em alguma coisa",
    detalhe: "Escolher uma coisa da casa e fazer junto",
    categoria: "casa",
    recorrencia: { tipo: "diario" },
    dono: "Akiane",
    ancora: false,
    akiane: true,
  },
];

/* ── Pendências ─────────────────────────────────────────────────────────────
   As reais do vault. `atualizado` é o que alimenta o "parada há N dias".

   Revisão de 25/07: saíram três. A das métricas do 1º post, porque o Yan matou
   a tarefa. A da "próxima trilha", porque era invenção minha atribuída ao
   André e nunca existiu no vault. E a de confirmar a volta às aulas, porque foi
   confirmada e virou dado real lá em cima. */

export const PENDENCIAS: Pendencia[] = [
  { id: "d1", projeto: "Lar Interior", titulo: "Revisar a copy da landing page", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04", vaultNota: "Lar Interior - Visão Geral" },
  { id: "d2", projeto: "Lar Interior", titulo: "Editar as fotos de Ubatuba e subir na landing", status: "aberta", responsavel: "Yan", nota: "Fotos tiradas em 28/06. Passou pro Yan em 25/07", atualizado: "2026-07-25" },
  { id: "d3", projeto: "Lar Interior", titulo: "Trocar os links das bios pro domínio novo", status: "aberta", responsavel: "Yan", nota: "larinterior.serenamentefeliz.com no ar desde 20/07", atualizado: "2026-07-20" },
  { id: "d4", projeto: "Lar Interior", titulo: "Automação de boas-vindas no Brevo e hard bounce", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d5", projeto: "Lar Interior", titulo: "Definir a sequência de aquecimento no Brevo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d6", projeto: "Lar Interior", titulo: "Instrumentar o PostHog na landing", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "d7", projeto: "Lar Interior", titulo: "Revisar e aprovar os 5 roteiros de Reels", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "d8", projeto: "Lar Interior", titulo: "Gravar as 7 aulas do Desafio", status: "aberta", responsavel: "Liz", nota: "Cenários de natureza, Ubatuba", atualizado: "2026-06-20", vaultNota: "Lar Interior - Estrutura das Aulas" },
  { id: "d9", projeto: "Lar Interior", titulo: "Gravar os bônus (meditação, SOS, rastreador)", status: "aberta", responsavel: "Liz", atualizado: "2026-06-20" },
  { id: "d10", projeto: "Lar Interior", titulo: "Escrever o texto da Carta do Dia 14", status: "aberta", responsavel: "Liz", nota: "O mecanismo já está pronto no app", atualizado: "2026-07-12" },

  { id: "d11", projeto: "Método Cálice", titulo: "Validar o conteúdo do quiz (8 perguntas, 4 resultados)", status: "aberta", responsavel: "Ge", nota: "O quiz já está público e testado. Falta só o aval", atualizado: "2026-07-20", vaultNota: "Quiz Diagnóstico - Estrutura e Copy" },
  { id: "d12", projeto: "Método Cálice", titulo: "Gravar áudios (dias 3, 5, 9) e vídeo (dia 7)", status: "aberta", responsavel: "Ge", atualizado: "2026-07-08", vaultNota: "Método Cálice - Visão Geral" },

  { id: "d13", projeto: "App Serena", titulo: "Integrar o Asaas (webhook de pagamento)", status: "em-andamento", responsavel: "Yan", nota: "Sem ele não dá pra vender", atualizado: "2026-07-20", bloqueio: true, vaultNota: "App - Backlog Técnico e Funcionalidades" },
  { id: "d14", projeto: "App Serena", titulo: "Aplicar a migration 0006 (notas do Cálice e diário)", status: "aberta", responsavel: "Yan", nota: "Destrava 2 recursos que hoje ficam ocultos", atualizado: "2026-07-12" },
  { id: "d15", projeto: "App Serena", titulo: "Criar projeto no PostHog e colar a chave", status: "aberta", responsavel: "Yan", nota: "O código já está instrumentado, roda como no-op sem a chave", atualizado: "2026-07-12" },
  { id: "d16", projeto: "App Serena", titulo: "Definir a data de lançamento", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },

  { id: "d17", projeto: "Consciente Momento", titulo: "Definir banco de imagens alinhado ao Serena", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },

  { id: "d19", projeto: "TikTok", titulo: "Mapear o produto próprio da Camilla", status: "aberta", responsavel: "Camilla", nota: "Satélite de tráfego ainda não mapeado", atualizado: "2026-07-08" },

  /* Estava como "bloqueada" desde 24/07, e não está: ninguém depende de nada
     pra marcar uma reunião de família. Bloqueio é o que espera terceiro, e usar
     o rótulo pra "não fizemos ainda" esvazia o único status que a TV destaca. */
  { id: "d20", projeto: "Família", titulo: "Marcar a revisão da rotina com todos", status: "aberta", responsavel: "Yan", nota: "Estava marcada pra 17/06 e não aconteceu. As aulas voltam 27/07", atualizado: "2026-06-17", vaultNota: "Rotina - Família (Semana 1)" },
];

/* ── Compromissos e lembretes ───────────────────────────────────────────────
   Vazio, e é uma decisão, não um esquecimento.

   Os três que existiam aqui foram removidos em 25/07. A reunião de rotina
   tinha data e hora que eu inventei, e ela não está marcada. O lembrete do
   aval da Ge era cópia de uma pendência que já existe (`d11`), com um prazo que
   também era meu. O review semanal do vault é convenção do vault, não
   compromisso da família na parede da sala.

   Compromisso é a única coisa aqui que nasce inteira da família: quem digita
   "terça 9h dentista da Akiane" na tela cria o dado certo em um segundo. Semear
   isso com palpite ensina a casa a desconfiar do painel, que é o oposto do que
   ele existe pra fazer. */

export const COMPROMISSOS: Compromisso[] = [];

/* ── Lista da casa ───────────────────────────────────────────────────────── */

export const LISTA_CASA: ItemCasa[] = [
  { id: "l1", titulo: "Café", por: "Liz", feito: false, criadoEm: "2026-07-22" },
  { id: "l2", titulo: "Fruta pra semana", por: "Ge", feito: false, criadoEm: "2026-07-22" },
  { id: "l3", titulo: "Pilha do controle", por: "Yan", feito: true, criadoEm: "2026-07-20" },
];

/* Os números do negócio saíram em 25/07. Estavam mockados em zero e ocupavam
   um quarto da coluna direita da TV. Voltam quando puderem ser lidos de
   verdade do Supabase do `serena-app`, agregados e nunca linha de lead. */

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

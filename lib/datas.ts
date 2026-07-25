/* Datas do Zuppas Life.

   Uma regra só, e ela vale pro app inteiro: **"hoje" é uma função, não um
   `new Date()` espalhado pelas telas**. A auditoria de 24/07 achou `new Date()`
   em duas páginas, cada uma decidindo por conta própria que dia era. Com rotina
   por data isso vira erro de um dia na virada da meia-noite, e a família marca
   a âncora de ontem sem saber.

   Todas as datas do app são a string ISO `YYYY-MM-DD` no fuso de Ubatuba, e
   nunca um objeto `Date` cru viajando entre módulos. Comparar string ISO é
   comparar data; comparar `Date` é comparar instante, que é outra coisa. */

export const FUSO = "America/Sao_Paulo";

const NOMES_DIA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

const NOMES_DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const NOMES_MES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Data de hoje em Ubatuba, como `YYYY-MM-DD`.

    O truque do locale `sv-SE` é que ele já formata em ISO, então não é preciso
    remontar a string a partir das partes e errar o zero à esquerda. */
export function hojeISO(momento: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(momento);
}

/** Hora do relógio de Ubatuba, `HH:MM`. */
export function horaISO(momento: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(momento);
}

/** Hora cheia (0 a 23) em Ubatuba. Decide bloco do dia e véu de noite. */
export function horaDoDia(momento: Date = new Date()): number {
  return Number(horaISO(momento).slice(0, 2));
}

/** Carimbo completo, pra registrar quando algo foi marcado. */
export function agoraISO(momento: Date = new Date()): string {
  return momento.toISOString();
}

/* ── Aritmética de data ──────────────────────────────────────────────────────
   Tudo passa por UTC ao meio-dia. Meio-dia porque nenhuma mudança de fuso do
   mundo real move a data quando se está a 12 horas das duas bordas. */

function paraUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}

function paraISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo, igual a `Date.getDay()`. */
export function diaDaSemana(iso: string): number {
  return paraUTC(iso).getUTCDay();
}

export function somarDias(iso: string, dias: number): string {
  const d = paraUTC(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraISO(d);
}

/** Diferença em dias inteiros. Positivo quando `fim` é depois de `inicio`. */
export function diasEntre(inicio: string, fim: string): number {
  const ms = paraUTC(fim).getTime() - paraUTC(inicio).getTime();
  return Math.round(ms / 86_400_000);
}

/** Segunda-feira da semana da data. A semana da casa começa na segunda porque
    é quando a escola e o rodízio recomeçam, não no domingo. */
export function inicioDaSemana(iso: string): string {
  const dia = diaDaSemana(iso);
  const recuo = dia === 0 ? 6 : dia - 1;
  return somarDias(iso, -recuo);
}

/** Os 7 dias da semana da data, de segunda a domingo. */
export function diasDaSemana(iso: string): string[] {
  const inicio = inicioDaSemana(iso);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/** Número da semana ISO. É o que faz o rodízio girar: quem varre esta semana
    sai de `semanaISO % tamanho do rodízio`, sem precisar guardar estado. */
export function semanaISO(iso: string): number {
  const d = paraUTC(iso);
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAno = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - inicioAno) / 86_400_000 + 1) / 7);
}

/* ── Formatação ──────────────────────────────────────────────────────────── */

export function nomeDoDia(iso: string): string {
  return NOMES_DIA[diaDaSemana(iso)];
}

export function nomeDoDiaCurto(iso: string): string {
  return NOMES_DIA_CURTO[diaDaSemana(iso)];
}

/** "sexta, 24 de julho" */
export function porExtenso(iso: string): string {
  const d = paraUTC(iso);
  return `${NOMES_DIA[d.getUTCDay()]}, ${d.getUTCDate()} de ${NOMES_MES[d.getUTCMonth()]}`;
}

/** "24/07" */
export function curta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Distância em linguagem de gente. É o que faz a pendência parada aparecer:
    a arquitetura prometia "parada há 5 dias fica visível sem ninguém cobrar" e
    o campo existia sem nunca ser mostrado. */
export function haQuantoTempo(iso: string, referencia: string): string {
  const dias = diasEntre(iso, referencia);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 14) return "há 1 semana";
  if (dias < 31) return `há ${Math.floor(dias / 7)} semanas`;
  if (dias < 60) return "há 1 mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

/** Quanto falta pra uma data. Negativo vira "atrasado". */
export function quandoFalta(iso: string, referencia: string): string {
  const dias = diasEntre(referencia, iso);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "venceu ontem";
  if (dias < 0) return `venceu há ${Math.abs(dias)} dias`;
  if (dias < 7) return `em ${dias} dias`;
  return curta(iso);
}

export function ehFimDeSemana(iso: string): boolean {
  const dia = diaDaSemana(iso);
  return dia === 0 || dia === 6;
}

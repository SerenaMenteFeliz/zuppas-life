/* Matemática do calendário mensal do painel de conteúdo.

   Mora em lib/ e não dentro do componente de propósito: grade de mês é o tipo
   de conta que erra por um dia sem nada acusar (semana começando no dia
   errado, mês de 31 dias perdendo o último, fevereiro), e o resultado de errar
   é a Ge olhar o calendário e ver o post no dia errado. Aqui vira asserção em
   `npm run verificar`.

   Tudo em UTC sobre string ISO. Usar Date local aqui reintroduziria o
   deslocamento de fuso que lib/datas.ts existe pra resolver: às 21h de
   Brasília o "hoje" em UTC já é amanhã, e a célula do calendário mudaria de
   lugar dependendo da hora em que a página foi aberta. */

import { diasDaSemana, inicioDaSemana, somarDias } from "./datas";

export type Celula = { iso: string; doMes: boolean };

const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Normaliza o parâmetro de mês da URL. Entrada inválida cai no mês de
    referência em vez de quebrar a página — é query string, qualquer um digita
    qualquer coisa. */
export function mesValido(bruto: string | undefined, referencia: string): string {
  if (bruto && RE_MES.test(bruto)) return bruto;
  return referencia.slice(0, 7);
}

export function deslocarMes(mes: string, passos: number): string {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  const total = ano * 12 + (m - 1) + passos;
  const novoAno = Math.floor(total / 12);
  const novoMes = total - novoAno * 12 + 1;
  return String(novoAno).padStart(4, "0") + "-" + String(novoMes).padStart(2, "0");
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DIA = 86_400_000;

/** Semanas de segunda a domingo cobrindo o mês inteiro, com os dias vizinhos
    completando as pontas (marcados `doMes: false` pra ficarem apagados).

    Segunda como primeiro dia porque é assim que o resto do app já mostra a
    semana (ver lib/datas.ts, inicioDaSemana) — duas convenções de início de
    semana no mesmo produto seria armadilha garantida. */
export function gradeDoMes(mes: string): Celula[][] {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));

  const primeiro = Date.UTC(ano, m - 1, 1);
  const ultimo = Date.UTC(ano, m, 0);

  /* getUTCDay: 0 = domingo. Convertido pra 0 = segunda. */
  const recuo = (new Date(primeiro).getUTCDay() + 6) % 7;
  const avanco = 6 - ((new Date(ultimo).getUTCDay() + 6) % 7);

  const inicio = primeiro - recuo * DIA;
  const fim = ultimo + avanco * DIA;

  const semanas: Celula[][] = [];
  let semana: Celula[] = [];
  for (let t = inicio; t <= fim; t += DIA) {
    const d = iso(t);
    semana.push({ iso: d, doMes: d.slice(0, 7) === mes });
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  return semanas;
}

const MESES = [
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

export function rotuloDoMes(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1] + " de " + mes.slice(0, 4);
}

export const DIAS_DA_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/* ── Visão de semana (21/08/2026) ──

   O mês responde "como está o mês"; a semana responde "o que eu faço agora".
   São perguntas diferentes e por isso são duas visões, não um zoom da mesma.

   A semana é identificada pela segunda-feira dela (`?semana=2026-08-17`), e não
   por número de semana: número ISO é preciso e ilegível, e a URL aqui é pra
   pessoa ler e compartilhar. As contas reusam lib/datas.ts em vez de refazer a
   aritmética aqui, senão o app passaria a ter duas ideias de quando a semana
   começa. */

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

function diaReal(bruto: string): boolean {
  if (!RE_DIA.test(bruto)) return false;
  /* Regex não pega 2026-02-31: só a volta pelo Date confirma que o dia existe
     de fato no calendário. */
  const d = new Date(bruto + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === bruto;
}

/** Normaliza o parâmetro de semana da URL para a segunda-feira dela. Qualquer
    dia da semana serve de entrada; entrada inválida cai na semana da
    referência, mesma política do mês. */
export function semanaValida(bruto: string | undefined, referencia: string): string {
  return inicioDaSemana(bruto && diaReal(bruto) ? bruto : referencia);
}

export function deslocarSemana(segunda: string, passos: number): string {
  return somarDias(segunda, passos * 7);
}

export function gradeDaSemana(segunda: string): Celula[] {
  /* `doMes` é sempre true aqui: na visão de semana não existe "dia de fora",
     todo dia mostrado pertence à semana. O campo fica pro tipo continuar o
     mesmo e a célula do calendário não precisar saber em qual visão está. */
  return diasDaSemana(segunda).map((dia) => ({ iso: dia, doMes: true }));
}

export function rotuloDaSemana(segunda: string): string {
  const dias = diasDaSemana(segunda);
  const domingo = dias[6];

  const numero = (d: string) => String(Number(d.slice(8, 10)));
  const mes = (d: string) => MESES[Number(d.slice(5, 7)) - 1];
  const ano = (d: string) => d.slice(0, 4);

  if (ano(segunda) !== ano(domingo)) {
    return (
      numero(segunda) + " de " + mes(segunda) + " de " + ano(segunda) +
      " a " + numero(domingo) + " de " + mes(domingo) + " de " + ano(domingo)
    );
  }
  if (mes(segunda) !== mes(domingo)) {
    return numero(segunda) + " de " + mes(segunda) + " a " + numero(domingo) + " de " + mes(domingo);
  }
  return numero(segunda) + " a " + numero(domingo) + " de " + mes(segunda);
}

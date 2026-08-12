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

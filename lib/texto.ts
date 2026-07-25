import { diaDaSemana, somarDias } from "./datas";
import { PESSOAS, blocoDaHora, type Bloco, type Dono, type Pessoa } from "./types";

/* Entrada em linguagem natural.

   "amanhã 9h dentista da Akiane" vira um compromisso preenchido, em vez de
   sete campos pra alguém tocar um por um. É o padrão que as ferramentas boas
   de tarefa usam há anos, e aqui ele importa mais que o normal: quem vai
   escrever isso é alguém no meio da cozinha, com o celular numa mão só. Se
   agendar custar mais que mandar mensagem no grupo pedindo pra lembrar,
   ninguém agenda.

   O que a frase entende, tudo opcional e em qualquer ordem:

   | Escrevendo | Vira |
   |---|---|
   | hoje, amanhã, depois de amanhã | a data |
   | segunda, terça… (com ou sem "que vem") | o próximo dia daquela semana |
   | dia 30 · 30/07 · 30/07/2026 | a data exata |
   | 9h · 9:30 · 14h30 · às 21h | o horário (e o bloco sai dele) |
   | de manhã, à tarde, à noite | o bloco, quando não há hora |
   | Liz, pro André, da Akiane, casa | de quem é |
   | lembrete, lembrar | tipo lembrete em vez de compromisso |

   Tudo que sobra vira o título. Nada é obrigatório: o que a frase não disser,
   o formulário mantém no padrão, e o resultado fica sempre visível antes de
   confirmar, porque adivinhar errado em silêncio é pior que não adivinhar. */

export interface Interpretacao {
  titulo: string;
  data?: string;
  horario?: string;
  bloco?: Bloco;
  para?: Dono;
  tipo?: "compromisso" | "lembrete";
  /** Pedaços reconhecidos, pra mostrar o que foi entendido. */
  achados: string[];
}

const COM_ACENTO = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
const SEM_ACENTO = "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";

/** Tira acento e caixa **preservando o tamanho da string**.

    O caminho óbvio, `normalize("NFD").replace(/[̀-ͯ]/g, "")`, encurta
    o texto: "amanhã" vira 7 caracteres antes de virar 6. Como este módulo
    procura no texto simplificado e depois recorta o texto original pelo índice
    encontrado, qualquer diferença de tamanho desalinha o recorte e come letra
    do título. Trocar caractere por caractere mantém os índices idênticos. */
function simples(texto: string): string {
  let saida = "";
  for (const ch of texto) {
    const i = COM_ACENTO.indexOf(ch);
    saida += i >= 0 ? SEM_ACENTO[i] : ch;
  }
  return saida.toLowerCase();
}

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

/** Próxima ocorrência daquele dia da semana, sempre no futuro.

    "sexta" numa sexta-feira significa a sexta que vem, não hoje: quem já está
    na sexta e escreve "sexta" está falando da próxima. */
function proximoDiaDaSemana(hoje: string, alvo: number, semanaQueVem: boolean): string {
  const atual = diaDaSemana(hoje);
  let avanco = (alvo - atual + 7) % 7;
  if (avanco === 0) avanco = 7;
  if (semanaQueVem && avanco < 7) avanco += 7;
  return somarDias(hoje, avanco);
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function interpretar(entrada: string, hoje: string): Interpretacao {
  let resto = ` ${entrada} `;
  const achados: string[] = [];
  const r: Interpretacao = { titulo: "", achados };

  /* Consome um trecho do texto e registra o que foi entendido. */
  const consumir = (padrao: RegExp, rotulo?: string) => {
    const alvo = simples(resto);
    const achado = alvo.match(padrao);
    if (!achado || achado.index === undefined) return null;
    resto = resto.slice(0, achado.index) + " " + resto.slice(achado.index + achado[0].length);
    if (rotulo) achados.push(rotulo);
    return achado;
  };

  /* ── Tipo ───────────────────────────────────────────────────────────── */
  if (consumir(/\b(lembrete|lembrar|me lembra)\b/, "lembrete")) {
    r.tipo = "lembrete";
  }

  /* ── Data explícita: 30/07 ou 30/07/2026 ────────────────────────────── */
  const barras = consumir(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (barras) {
    const dia = Number(barras[1]);
    const mes = Number(barras[2]);
    const anoBruto = barras[3];
    const ano = anoBruto
      ? Number(anoBruto.length === 2 ? `20${anoBruto}` : anoBruto)
      : Number(hoje.slice(0, 4));
    r.data = `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
    achados.push("data");
  }

  /* ── "dia 30" ───────────────────────────────────────────────────────── */
  if (!r.data) {
    const diaDoMes = consumir(/\bdia (\d{1,2})\b/);
    if (diaDoMes) {
      const dia = Number(diaDoMes[1]);
      const ano = Number(hoje.slice(0, 4));
      const mes = Number(hoje.slice(5, 7));
      let candidata = `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
      /* Dia que já passou neste mês quer dizer o mês que vem. */
      if (candidata < hoje) {
        const proximoMes = mes === 12 ? 1 : mes + 1;
        const proximoAno = mes === 12 ? ano + 1 : ano;
        candidata = `${proximoAno}-${doisDigitos(proximoMes)}-${doisDigitos(dia)}`;
      }
      r.data = candidata;
      achados.push("data");
    }
  }

  /* ── Relativas ──────────────────────────────────────────────────────── */
  if (!r.data) {
    if (consumir(/\bdepois de amanha\b/, "data")) r.data = somarDias(hoje, 2);
    else if (consumir(/\bamanha\b/, "data")) r.data = somarDias(hoje, 1);
    else if (consumir(/\bhoje\b/, "data")) r.data = hoje;
  }

  /* ── Dia da semana ──────────────────────────────────────────────────── */
  if (!r.data) {
    for (const [nome, numero] of Object.entries(DIAS_SEMANA)) {
      const achado = consumir(
        new RegExp(`\\b(?:na |a |essa |proxima )?${nome}(?:-feira)?( que vem)?\\b`)
      );
      if (achado) {
        r.data = proximoDiaDaSemana(hoje, numero, Boolean(achado[1]));
        achados.push("data");
        break;
      }
    }
  }

  /* ── Horário: 9h, 9:30, 14h30, às 21h ───────────────────────────────── */
  const hora = consumir(/\b(?:as |às )?([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/);
  if (hora) {
    r.horario = `${doisDigitos(Number(hora[1]))}:${hora[2] ?? "00"}`;
    r.bloco = blocoDaHora(Number(hora[1]));
    achados.push("hora");
  }

  /* ── Bloco por extenso, só se não houver hora ───────────────────────── */
  if (!r.horario) {
    if (consumir(/\b(?:de |pela )?manha\b/, "manhã")) r.bloco = "manha";
    else if (consumir(/\b(?:a |de |pela )?tarde\b/, "tarde")) r.bloco = "tarde";
    else if (consumir(/\b(?:a |de |pela )?noite\b/, "noite")) r.bloco = "noite";
  }

  /* ── De quem é ──────────────────────────────────────────────────────── */
  if (consumir(/\b(?:pra |para )?(?:a )?casa\b/, "casa")) {
    r.para = "Casa";
  } else {
    for (const pessoa of PESSOAS) {
      const nome = simples(pessoa);
      const achado = consumir(
        new RegExp(`\\b(?:pro |pra |para |do |da |de |o |a )?${nome}\\b`)
      );
      if (achado) {
        r.para = pessoa as Pessoa;
        achados.push(pessoa);
        break;
      }
    }
  }

  /* O que sobrou é o título. Limpa conectivos órfãos que ficaram soltos. */
  r.titulo = resto
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:de|da|do|pra|para|a|o|as|os|e|no|na)\s+/i, "")
    .replace(/\s+(?:de|da|do|pra|para|a|o|e|no|na)\s*$/i, "")
    .trim();

  return r;
}

import "server-only";
import { FUNCAO_INFO, FUNCOES_FALA, perfilPorId } from "@/lib/conteudo-tipos";
import {
  fichaDoPerfil,
  fichaPreenchida,
  localPorId,
  REGRAS,
  type Local,
} from "@/lib/ia/inteligencia";

/* As instruções de sistema. `server-only` de propósito: prompt não precisa
   atravessar pro navegador, e o que não atravessa não pode ser lido nem
   adulterado por quem abrir o painel.

   ── Duas instruções diferentes, não duas variações ──

   Importar é "não invente nada do que ela escreveu, só organize". Gerar é o
   oposto. Prompt único pros dois entrega o pior dos dois: um importador que
   melhora o texto da Ge sem pedir (e ela perde a própria voz sem saber por quê)
   ou um gerador tímido que devolve tópicos.

   ── A parte que os dois compartilham ──

   Cena. E é aí que mora o achado que reordenou o projeto (22/08/2026): **o
   Importar TAMBÉM inventa cena.** O roteiro colado traz só a fala; enquadramento,
   cenário e ação chegam vazios e é o modelo que preenche. Então a viabilidade de
   gravação morde desde a primeira versão, não só quando a gente for gerar do
   zero. Sem o bloco de local abaixo, a estreia da Ge seria um roteiro cheio de
   cena que ela não consegue gravar hoje. */

function blocoFuncoes(): string {
  return FUNCOES_FALA.map((f) => "- " + f + ": " + FUNCAO_INFO[f].ajuda).join("\n");
}

function blocoLocal(local: Local | undefined): string {
  if (!local) {
    return [
      "LOCAL DE GRAVAÇÃO: não escolhido.",
      "Como você não sabe onde isso vai ser gravado, proponha cena que funcione dentro de casa,",
      "com o celular apoiado em algo. Nada que dependa de sair, de clima, de outra pessoa segurando",
      "a câmera ou de equipamento. Cena impossível é o motivo mais comum de um roteiro nunca virar",
      "vídeo.",
    ].join(" ");
  }

  const linhas = [
    "LOCAL DE GRAVAÇÃO: " + local.rotulo + " (" + local.esforco + ").",
    "TODA cena precisa caber neste local. Não proponha nada que exija outro lugar.",
  ];

  if (local.recursos.length > 0) {
    linhas.push("O que existe ali, e é só com isso que você pode contar:");
    linhas.push(local.recursos.map((r) => "- " + r).join("\n"));
  } else {
    /* Local sem recursos descritos ainda constrange bastante: já impede propor
       praia pra quem vai gravar na cozinha. O que ele não dá é precisão, e é
       melhor dizer isso ao modelo do que deixá-lo preencher a lacuna com uma
       casa imaginária. */
    linhas.push(
      "Ninguém descreveu ainda o que existe neste lugar. Então fique no genérico e no seguro:" +
        " não invente cômodo, móvel, janela, vista nem objeto específico. Prefira cena que" +
        " funcione em qualquer casa.",
    );
  }

  linhas.push(
    "Cena cara é armadilha: nada de drone, timelapse, troca de figurino, ajuda de outra pessoa" +
      " ou mais de um lugar no mesmo vídeo. O que prende quem assiste é a primeira frase, não a" +
      " produção.",
  );

  return linhas.join("\n");
}

function blocoRegras(): string {
  if (REGRAS.length === 0) return "";
  return (
    "REGRAS DE ROTEIRO (valem sempre):\n" + REGRAS.map((r) => "- " + r.texto).join("\n")
  );
}

function blocoCenas(cenas: string[]): string {
  if (cenas.length === 0) return "";
  return (
    "CENAS QUE JÁ FUNCIONARAM NESTE LOCAL. Prefira reaproveitar ou variar em cima destas, porque" +
    " elas já foram gravadas de verdade:\n" +
    cenas.map((c) => "- " + c).join("\n")
  );
}

function blocoPerfil(perfilId: string): string {
  const f = fichaDoPerfil(perfilId);
  const p = perfilPorId(perfilId);
  const nome = p ? p.dono : perfilId;

  if (!fichaPreenchida(f)) {
    return (
      "QUEM FALA: " +
      nome +
      ". A ficha de voz dela ainda não foi preenchida, então você NÃO sabe como ela escreve." +
      " Não invente personalidade, bordão nem estilo. Escreva em português do Brasil, claro e" +
      " direto, sem jargão de coach e sem promessa exagerada."
    );
  }

  const linhas = [
    "QUEM FALA: " + nome + ".",
    "Público: " + f.publico,
    "A dor que esse público já sente e sabe nomear: " + f.dor,
    "Tom: " + f.tom,
    "Duração alvo: " + f.duracaoAlvo,
    "Como os ganchos dela funcionam: " + f.ganchos,
  ];

  if (f.vocabulario.length > 0) {
    linhas.push("Palavras e expressões que ela usa: " + f.vocabulario.join(", "));
  }
  if (f.naoDizer.length > 0) {
    linhas.push("NUNCA diga: " + f.naoDizer.join("; "));
  }
  if (f.observado.length > 0) {
    linhas.push("O que ela de fato faz hoje:\n" + f.observado.map((o) => "- " + o).join("\n"));
  }
  if (f.diretriz.length > 0) {
    /* Diretriz vem DEPOIS de observado e com esta frase na frente: sem ela, o
       modelo trata o hábito atual como regra e defende justamente o que a
       pessoa está tentando abandonar. */
    linhas.push(
      "Para onde ela quer levar o conteúdo. Quando isto conflitar com o hábito acima, isto vence:\n" +
        f.diretriz.map((d) => "- " + d).join("\n"),
    );
  }
  if (f.exemplos.length > 0) {
    linhas.push(
      "Falas reais dela que funcionaram. Aprenda o RITMO e o VOCABULÁRIO, não copie:\n" +
        f.exemplos.map((e) => '- "' + e.fala + '" (' + e.porque + ")").join("\n"),
    );
  }

  return linhas.join("\n");
}

const COMUM = [
  "Você trabalha dentro do painel de conteúdo de uma família que produz vídeo curto sobre",
  "bem-estar e reprogramação mental, em português do Brasil.",
  "",
  "O roteiro é uma LISTA DE FALAS, não um texto corrido. Isso não é formatação: a gravação",
  "acontece frase por frase, e cada item precisa ser uma frase que dá pra gravar de uma vez.",
  "Frase longa demais pra dizer num fôlego deve ser quebrada em duas.",
  "",
  "FUNÇÃO DE CADA FALA:",
  blocoFuncoes(),
  "",
  "Um roteiro normal abre em gancho e fecha em cta, com um cta só. Nem toda fala precisa de",
  "função: quando não estiver claro, deixe vazio em vez de forçar um rótulo errado.",
  "",
  "Campo que você não tem como saber fica vazio. Nunca escreva 'a definir', 'n/a' ou",
  "reticências: o painel trata vazio como 'ninguém decidiu ainda', e texto de enchimento faz",
  "parecer decidido o que não foi.",
].join("\n");

export function instrucaoImportar(opcoes: {
  perfilId: string;
  localId: string | null;
  cenas: string[];
}): string {
  return [
    COMUM,
    "",
    "SUA TAREFA: alguém colou um roteiro que JÁ ESTÁ ESCRITO. Você vai organizar, não reescrever.",
    "",
    "A REGRA MAIS IMPORTANTE: as palavras da fala são dela, não suas. Copie o texto como está.",
    "Você pode: separar em falas, arrumar pontuação, tirar marcação que não é fala (como",
    "'CENA 1', 'GANCHO:', números de linha, indicação de tempo, emoji solto de anotação).",
    "Você NÃO pode: melhorar a frase, trocar palavra por sinônimo, encurtar, deixar mais",
    "'profissional', acrescentar fala que não estava lá nem cortar fala que estava.",
    "Se o texto tiver erro de digitação óbvio, corrija; se tiver escolha estranha de palavra,",
    "deixe estranha. Ela escreveu assim de propósito até prova em contrário.",
    "",
    "O QUE VOCÊ INVENTA: só a cena. Enquadramento, cenário, ação, b-roll e texto na tela quase",
    "nunca vêm no texto colado, e é aí que você trabalha.",
    "",
    "Se o texto colado trouxer indicação de cena junto da fala, use a dela e não a sua.",
    "",
    blocoPerfil(opcoes.perfilId),
    "",
    blocoLocal(localPorId(opcoes.localId)),
    "",
    blocoCenas(opcoes.cenas),
    "",
    blocoRegras(),
    "",
    "Título e legenda: preencha só se der pra deduzir do que foi colado. Não force.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function instrucaoGerar(opcoes: {
  perfilId: string;
  localId: string | null;
  cenas: string[];
}): string {
  return [
    COMUM,
    "",
    "SUA TAREFA: escrever um roteiro novo a partir de um briefing.",
    "",
    "O briefing traz três coisas: o assunto, o que a pessoa que assiste tem que sentir ou",
    "entender no fim, e o pedido único do vídeo. As três mandam, nessa ordem de importância:",
    "se tiver que escolher entre cobrir o assunto inteiro e deixar a pessoa sentindo o que foi",
    "pedido, escolha o sentimento.",
    "",
    "UMA IDEIA POR VÍDEO. Roteiro que ensina três coisas não ensina nenhuma.",
    "",
    "A primeira fala carrega o vídeo. Ela precisa funcionar sem contexto nenhum, dita pra quem",
    "estava rolando o feed distraído. Não comece com saudação, apresentação, 'hoje eu vou falar",
    "sobre' nem pergunta genérica.",
    "",
    "Escreva pra ser DITO, não pra ser lido: frase curta, palavra comum, sem oração subordinada",
    "longa. Se você não conseguiria falar a frase em voz alta sem tropeçar, ela está errada.",
    "",
    blocoPerfil(opcoes.perfilId),
    "",
    blocoLocal(localPorId(opcoes.localId)),
    "",
    blocoCenas(opcoes.cenas),
    "",
    blocoRegras(),
    "",
    "Preencha título, legenda e hashtags. O título é pra reconhecer o post numa lista, não é o",
    "gancho: 'O cansaço que dormir não resolve' é título, 'Você já acordou mais cansada?' é",
    "gancho e pertence à primeira fala.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

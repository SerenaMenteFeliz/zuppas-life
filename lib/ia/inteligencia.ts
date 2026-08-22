/* A inteligência que alimenta a escrita de roteiro por IA.

   ── De onde isto vem, e quem edita ──

   Decisão-âncora do Yan (22/08/2026): **o vault é a fonte, esta plataforma é o
   espelho.** A Ge e a Liz não editam prompt nem ficha; elas veem o resultado e
   escrevem o briefing do momento. Quem edita isto é o Yan, pelo terminal, e o
   deploy publica.

   Não é padrão novo: é o mesmo que lib/conteudo-tipos.ts já usa pra PILARES e
   PERFIS desde 11/08 ("o vault é fonte de verdade do significado, esta lista é
   só o espelho operável"). A inteligência entra na mesma regra pelo motivo mais
   forte: instrução de IA editável por várias mãos, sem histórico, apodrece sem
   ninguém perceber. Alguém melhora uma frase, a qualidade cai três semanas
   depois, e não há de onde voltar. Aqui o git é esse histórico.

   Fonte no vault: `20 - Projetos/Zuppas Life/Zuppas Life - Fichas de Conteúdo.md`,
   que guarda a versão longa e o PORQUÊ de cada regra. Este arquivo guarda a
   versão curta, que é a que entra no prompt.

   ── Por que existe teto de tamanho aqui ──

   Ver `Conceito - Instrução de IA Precisa de Teto e Poda, Não de Acúmulo` no
   vault. Resumo do que importa pra quem mexe neste arquivo: o estudo "Context
   Rot" (Chroma, 2025) mediu 18 modelos de fronteira e achou desempenho caindo
   conforme a entrada cresce, MUITO antes de a janela encher. Uma janela de
   200K já degradada em 50K. E a degradação não levanta erro: o sistema segue
   respondendo, cada vez pior.

   Por isso os tetos abaixo não são burocracia. Estourar o teto obriga a
   escolher o que sai, e escolher é o trabalho que o acúmulo evita.

   ── Este arquivo é seguro no cliente ──

   É só dado. Nada de chave, nada de prompt de sistema (isso mora em
   lib/ia/prompts.ts, que é `server-only`). O dropdown de local no formulário do
   post importa daqui, e por isso ele não pode virar server-only. */

/** Quando a inteligência foi editada pela última vez. À mão, de propósito:
    data automática de build diria quando o deploy rodou, não quando alguém
    pensou sobre o conteúdo, e é a segunda que importa pra saber se a ficha
    está velha. */
export const ATUALIZADA_EM = "2026-08-22";

/* Tetos. Ver o bloco de cima pro porquê. */
export const TETO_REGRAS = 20;
export const TETO_LINHAS_FICHA = 60;

// ---------------------------------------------------------------------------
// Locais de gravação
// ---------------------------------------------------------------------------

/* A única ficha que não depende de material externo, e por isso a primeira a
   ficar útil: sai de uma conversa curta com a família, não de análise.

   **`recursos` é o campo que faz a diferença entre cena bonita e cena
   gravável.** "Casa" não diz nada ao modelo. O que decide se uma cena funciona
   é o que existe ali: onde bate luz natural e a que horas, se tem parede lisa,
   se tem verde, se dá pra apoiar o celular, se tem barulho. Sem isso o modelo
   escreve "a luz do fim de tarde entrando pela janela da sala" e pode não
   existir janela ali.

   `recursos` vazio NÃO desliga nada: o modelo ainda recebe o nome do local e o
   esforço, e já para de propor praia pra quem vai gravar na cozinha. Preencher
   melhora, não destrava.

   `esforco` é campo de verdade, não enfeite. É ele que deixa o quadro
   responder "por que quatro roteiros estão parados?" com "todos pedem praia".
   Mesma ideia do agrupamento de métricas por degrau de esforço (22/08). */
export type Local = {
  id: string;
  rotulo: string;
  /* O que existe ali, na prática. Alimentado pelo vault. */
  recursos: string[];
  /* Quanto custa gravar ali, em linguagem de gente. Aparece na tela. */
  esforco: string;
  /* Escala de 1 (sai agora) a 5 (dia inteiro). Serve pra ordenar e, mais pra
     frente, pra o quadro mostrar quanto trabalho parado depende de sair de
     casa. */
  peso: 1 | 2 | 3 | 4 | 5;
};

export const LOCAIS: Local[] = [
  {
    id: "casa",
    rotulo: "Casa",
    recursos: [],
    esforco: "Sai agora, sem deslocamento",
    peso: 1,
  },
  {
    id: "condominio",
    rotulo: "Condomínio",
    recursos: [],
    esforco: "Uns 10 minutos, e depende de não ter gente",
    peso: 2,
  },
  {
    id: "rua",
    rotulo: "Rua",
    recursos: [],
    esforco: "Meia hora",
    peso: 3,
  },
  {
    id: "praia",
    rotulo: "Praia",
    recursos: [],
    esforco: "Manhã inteira, depende de clima e de quem fica com as crianças",
    peso: 5,
  },
  {
    id: "montanha",
    rotulo: "Montanha",
    recursos: [],
    esforco: "Dia, depende de deslocamento",
    peso: 5,
  },
];

export function localPorId(id: string | null | undefined): Local | undefined {
  if (!id) return undefined;
  return LOCAIS.find((l) => l.id === id);
}

// ---------------------------------------------------------------------------
// Ficha de perfil
// ---------------------------------------------------------------------------

/* O que a IA precisa saber sobre quem fala, pra escrever na voz dela.

   **`observado` é separado de `diretriz` de propósito.** Observado é o que a
   pessoa de fato faz hoje, tirado do material real; diretriz é o que ela QUER
   fazer, inclusive o que quer parar de fazer. Ficha que mistura os dois congela
   hábito como se fosse escolha, e aí a IA passa a defender um jeito que a
   pessoa estava justamente tentando abandonar.

   **`procedencia` não é enfeite.** Toda linha de `observado` tem que poder
   responder "de onde você tirou isso?". Regra sem fonte não pode ser avaliada
   na próxima poda, e por isso nunca é cortada, que é exatamente como um
   arquivo de instrução incha até apodrecer.

   `exemplos` são falas reais que funcionaram, com o número que justificou a
   escolha. Exemplo real vale mais que qualquer adjetivo sobre tom: descrever
   uma voz é impreciso, mostrar três frases dela não é. */
export type FichaPerfil = {
  /* Casa com PERFIS de lib/conteudo-tipos.ts */
  perfilId: string;
  publico: string;
  dor: string;
  tom: string;
  vocabulario: string[];
  naoDizer: string[];
  ganchos: string;
  duracaoAlvo: string;
  observado: string[];
  diretriz: string[];
  exemplos: { fala: string; porque: string }[];
  procedencia: string | null;
};

function fichaVazia(perfilId: string): FichaPerfil {
  return {
    perfilId,
    publico: "",
    dor: "",
    tom: "",
    vocabulario: [],
    naoDizer: [],
    ganchos: "",
    duracaoAlvo: "",
    observado: [],
    diretriz: [],
    exemplos: [],
    procedencia: null,
  };
}

/* VAZIAS, e isso é honestidade, não pendência esquecida.

   Elas se preenchem com material real: transcrição dos roteiros publicados da
   Ge e o número de cada um. **Não com o que a IA acha que a Ge escreve.** Ficha
   preenchida por extrapolação vira instrução de sistema com cara de fato, molda
   todo roteiro futuro e ninguém audita depois. É o princípio 12 do vault
   ("inferência entra marcada como inferência, ou não entra") no seu caso mais
   caro, porque aqui o palpite não fica numa nota: ele escreve.

   Duas coisas que o material precisa ter, e que valem mais que o volume:

   1. **"Deu certo" tem que ser o NÚMERO, não a lembrança.** Seleção por memória
      ensina o viés de quem lembrou, não o que funcionou.
   2. **Os que fracassaram também.** Ficha feita só de acertos não separa o que
      CAUSOU o acerto do que é só o jeito dela. O contraste é onde está o sinal.

   Enquanto estiverem vazias, a função Gerar fica desligada. Ver
   `podeGerar()`. A função Importar não depende delas. */
export const FICHAS: FichaPerfil[] = [fichaVazia("liz"), fichaVazia("geovana")];

export function fichaDoPerfil(perfilId: string): FichaPerfil {
  return FICHAS.find((f) => f.perfilId === perfilId) ?? fichaVazia(perfilId);
}

export function fichaPreenchida(f: FichaPerfil): boolean {
  /* O critério é o que o prompt precisa pra não sair genérico: quem é o
     público, como ela soa, e pelo menos um exemplo real. Tom sozinho vira
     adjetivo, e adjetivo não ensina voz. */
  return f.publico.trim() !== "" && f.tom.trim() !== "" && f.exemplos.length > 0;
}

// ---------------------------------------------------------------------------
// Regras de roteiro
// ---------------------------------------------------------------------------

/* Destiladas do material de estudo do Yan. O material NÃO vai cru pro prompt:
   não por cota (250K TPM é folgado), mas porque texto longo dilui a atenção do
   modelo, que é o recurso escasso de verdade aqui.

   `confianca` existe pra que a poda tenha o que olhar. "hipotese" é candidata a
   corte assim que houver evidência contra; "alta" só com fonte real. */
export type Regra = {
  texto: string;
  fonte: string;
  confianca: "alta" | "media" | "hipotese";
};

/* VAZIAS, aguardando o material de estudo do Yan.

   Uma hipótese já registrada no vault em 22/08 e ainda NÃO confrontada com o
   material, por isso não está na lista abaixo: cena criativa parece ser
   armadilha em vídeo curto deste nicho (drone, timelapse, três locações num
   vídeo de 40 segundos), porque a criatividade mora no gancho e no ângulo do
   texto, e a cena boa é a que não atrapalha a fala nem impede a gravação de
   acontecer hoje. Se o material do Yan contradiz, o material ganha. */
export const REGRAS: Regra[] = [];

// ---------------------------------------------------------------------------

/** A função Gerar só liga quando há ficha de verdade pra este perfil.

    Isso é trava de produto, não de código, e a razão está no vault: roteiro
    gerado sem ficha sai genérico, e a primeira impressão é a única que existe.
    Se a Ge clicar em "Gerar" e vier texto de IA sem alma, ela volta pro fluxo
    dela e não clica de novo, mesmo depois de a ficha ficar boa. Ferramenta
    interna não ganha segunda chance porque não tem marketing pra convencer a
    voltar.

    O Gerar existe inteiro e testável desde o primeiro dia: o que falta é o
    conteúdo, e é isso que este booleano diz. */
export function podeGerar(perfilId: string): boolean {
  return fichaPreenchida(fichaDoPerfil(perfilId));
}

/** Resumo do estado da inteligência, pra tela de Inteligência não precisar
    recalcular isso em três lugares. */
export function estadoDaInteligencia() {
  const fichasProntas = FICHAS.filter(fichaPreenchida).length;
  const locaisDetalhados = LOCAIS.filter((l) => l.recursos.length > 0).length;
  return {
    atualizadaEm: ATUALIZADA_EM,
    fichasProntas,
    fichasTotal: FICHAS.length,
    locaisDetalhados,
    locaisTotal: LOCAIS.length,
    regras: REGRAS.length,
    tetoRegras: TETO_REGRAS,
    /* Importar funciona sem nada preenchido: ele classifica texto que já
       existe. É por isso que ele é a única função que entra em operação agora. */
    importarPronto: true,
    gerarPronto: fichasProntas > 0,
  };
}

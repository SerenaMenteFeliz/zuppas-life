import "server-only";
import { cenasDoLocal } from "@/lib/conteudo";
import { FORMATOS, FUNCOES_FALA, PILARES, type Fala } from "@/lib/conteudo-tipos";
import { esquemaRoteiro } from "@/lib/ia/esquemas";
import { podeGerar } from "@/lib/ia/inteligencia";
import { chamarModelo, ErroModelo } from "@/lib/ia/modelo";
import { instrucaoGerar, instrucaoImportar } from "@/lib/ia/prompts";
import { registrar } from "@/lib/registros";

/* As duas funções de alto nível: importar um roteiro colado e gerar um do zero.

   Elas devolvem um `RoteiroDaIA` e **não escrevem no banco**. Isso é decisão de
   desenho, não preguiça:

   O resultado vai pra PRÉVIA, a pessoa confere, e só então as falas entram no
   editor de roteiro que já existe, e é o autosave dele que grava, pelo mesmo
   caminho de sempre. Ou seja, a IA não abre um segundo caminho de escrita no
   roteiro.

   Isso importa porque o painel acabou de fechar, em 22/08, um caso de perda
   silenciosa de roteiro (o DELETE por complemento). Um caminho de escrita
   paralelo, com regra própria de o que apagar, reintroduziria a mesma classe de
   defeito por outra porta. Aqui a IA só propõe texto; quem grava continua sendo
   quem sempre gravou. */

export type FalaDaIA = Omit<Fala, "id" | "gravada">;

export type RoteiroDaIA = {
  titulo: string;
  legenda: string;
  hashtags: string;
  formato: string | null;
  pilar: string | null;
  falas: FalaDaIA[];
};

export type ResultadoIA = {
  roteiro: RoteiroDaIA;
  modelo: string;
  chave: string;
  tentativas: number;
  duracaoMs: number;
  /* Coisas que a validação corrigiu ou descartou. A tela mostra isso: correção
     silenciosa é como se aprende a confiar numa saída que já vinha errada. */
  avisos: string[];
};

/* Teto de falas. Um roteiro de vídeo curto real tem entre 5 e 20; 60 é folga
   pra carrossel longo. O teto existe porque uma resposta desgovernada não pode
   virar 400 linhas no banco de uma vez. */
const MAX_FALAS = 60;
const MAX_TEXTO = 2000;

function limpar(v: unknown, max = 400): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t === "") return "";
  /* Modelo às vezes preenche campo vazio com marcador em vez de deixar vazio, e
     isso é pior que vazio: o painel trata vazio como "ninguém decidiu ainda", e
     "a definir" parece decisão. */
  if (/^(n\/?a|nao se aplica|não se aplica|a definir|-+|\.\.\.|—)$/i.test(t)) return "";
  return t.slice(0, max);
}

function ouNulo(v: string): string | null {
  return v === "" ? null : v;
}

function daLista(v: unknown, lista: readonly string[]): string | null {
  const t = limpar(v, 120);
  return lista.includes(t) ? t : null;
}

/** Valida o que veio do modelo, mesmo tendo mandado schema.

    O schema é promessa do provedor, e promessa é do lado de fora: a resposta
    chega por HTTP, de um serviço que muda de forma, e a API `/interactions` é
    nova o bastante pra isso não ser paranoia. Se o enum falhar do lado deles,
    quem paga é o dropdown que fica em branco sem explicação. */
function validar(bruto: unknown): { roteiro: RoteiroDaIA; avisos: string[] } {
  const avisos: string[] = [];
  const o = (bruto ?? {}) as Record<string, unknown>;

  const brutasFalas = Array.isArray(o.falas) ? o.falas : [];
  if (brutasFalas.length === 0) {
    throw new ErroModelo("A IA não devolveu nenhuma fala. Tente de novo ou ajuste o texto.");
  }

  let cortadas = 0;
  let vazias = 0;
  let funcoesInvalidas = 0;

  const usaveis = brutasFalas.slice(0, MAX_FALAS);
  if (brutasFalas.length > MAX_FALAS) cortadas = brutasFalas.length - MAX_FALAS;

  const falas: FalaDaIA[] = [];
  for (const bf of usaveis) {
    const f = (bf ?? {}) as Record<string, unknown>;
    const texto = limpar(f.texto, MAX_TEXTO);
    if (texto === "") {
      /* Fala sem texto não é fala. Deixar entrar encheria o roteiro de linhas
         em branco que alguém teria que apagar uma por uma. */
      vazias += 1;
      continue;
    }

    const funcaoBruta = limpar(f.funcao, 40).toLowerCase();
    const funcao = FUNCOES_FALA.includes(funcaoBruta as (typeof FUNCOES_FALA)[number])
      ? funcaoBruta
      : null;
    if (funcaoBruta !== "" && funcao === null) funcoesInvalidas += 1;

    falas.push({
      ordem: falas.length + 1,
      texto,
      funcao,
      enquadramento: ouNulo(limpar(f.enquadramento)),
      cenario: ouNulo(limpar(f.cenario)),
      acao: ouNulo(limpar(f.acao)),
      broll: ouNulo(limpar(f.broll)),
      texto_tela: ouNulo(limpar(f.texto_tela)),
      observacao: ouNulo(limpar(f.observacao)),
    });
  }

  if (falas.length === 0) {
    throw new ErroModelo("A IA devolveu falas, mas todas vieram em branco.");
  }

  if (cortadas > 0) avisos.push("A resposta veio com falas demais. Fiquei nas primeiras " + MAX_FALAS + ".");
  if (vazias > 0) avisos.push(vazias === 1 ? "Descartei 1 fala em branco." : "Descartei " + vazias + " falas em branco.");
  if (funcoesInvalidas > 0) {
    avisos.push(
      "A IA inventou função fora da lista em " +
        funcoesInvalidas +
        (funcoesInvalidas === 1 ? " fala. Deixei ela sem função." : " falas. Deixei elas sem função."),
    );
  }

  return {
    roteiro: {
      titulo: limpar(o.titulo, 200),
      legenda: limpar(o.legenda, 4000),
      hashtags: limpar(o.hashtags, 600),
      formato: daLista(o.formato, FORMATOS),
      pilar: daLista(o.pilar, PILARES),
      falas,
    },
    avisos,
  };
}

async function executar(
  tarefa: "importar" | "gerar",
  opcoes: { postId: string; perfilId: string; localId: string | null; entrada: string },
): Promise<ResultadoIA> {
  const cenas = await cenasDoLocal(opcoes.localId);

  const instrucao =
    tarefa === "importar"
      ? instrucaoImportar({ perfilId: opcoes.perfilId, localId: opcoes.localId, cenas })
      : instrucaoGerar({ perfilId: opcoes.perfilId, localId: opcoes.localId, cenas });

  const r = await chamarModelo({
    tarefa,
    instrucaoSistema: instrucao,
    entrada: opcoes.entrada,
    schema: esquemaRoteiro(),
    /* Importar tem que ser fiel; gerar tem que ter voz. É a diferença entre as
       duas tarefas expressa no único parâmetro que a expressa. */
    temperatura: tarefa === "importar" ? 0.2 : 0.9,
    raciocinio: tarefa === "importar" ? "low" : "medium",
    refId: opcoes.postId,
  });

  const { roteiro, avisos } = validar(r.dados);

  await registrar({
    area: "ia",
    acao: tarefa,
    nivel: avisos.length > 0 ? "aviso" : "info",
    mensagem:
      (tarefa === "importar" ? "Roteiro importado" : "Roteiro gerado") +
      ": " +
      roteiro.falas.length +
      (roteiro.falas.length === 1 ? " fala" : " falas") +
      " por " +
      r.modelo +
      ".",
    detalhe: {
      modelo: r.modelo,
      chave: r.chave,
      tentativas: r.tentativas,
      /* Contagem que o próprio Google reportou. Serve pra responder "quanto a
         gente está gastando de cota por roteiro" sem estimativa. */
      tokensEntrada: r.tokens.entrada,
      tokensSaida: r.tokens.saida,
      falas: roteiro.falas.length,
      local: opcoes.localId,
      perfil: opcoes.perfilId,
      /* O texto de entrada NÃO entra no log: é o trabalho dela, o log é
         infraestrutura, e guardar conteúdo aqui faria a tela de Registros virar
         um segundo lugar onde o roteiro existe. Só o tamanho. */
      entradaChars: opcoes.entrada.length,
      avisos,
    },
    refTipo: "post",
    refId: opcoes.postId,
    duracaoMs: r.duracaoMs,
  });

  return {
    roteiro,
    modelo: r.modelo,
    chave: r.chave,
    tentativas: r.tentativas,
    duracaoMs: r.duracaoMs,
    avisos,
  };
}

/** Recebe o roteiro colado em texto solto e devolve falas estruturadas.

    É a única função da IA que entra em operação agora, e é a única que não
    depende de ficha nenhuma estar preenchida: ela classifica texto que já
    existe, em vez de inventar voz. */
export async function importarRoteiro(opcoes: {
  postId: string;
  perfilId: string;
  localId: string | null;
  texto: string;
}): Promise<ResultadoIA> {
  const texto = opcoes.texto.trim();
  if (texto.length < 20) {
    throw new ErroModelo("Cole o roteiro antes: o que veio é curto demais pra separar em falas.");
  }
  if (texto.length > 24_000) {
    throw new ErroModelo("Esse texto é grande demais pra um roteiro. Cole um post por vez.");
  }

  return executar("importar", {
    postId: opcoes.postId,
    perfilId: opcoes.perfilId,
    localId: opcoes.localId,
    entrada: "ROTEIRO COLADO:\n\n" + texto,
  });
}

/** Escreve um roteiro novo a partir do briefing de três campos.

    Trava de produto na entrada: sem ficha preenchida pro perfil, isto não roda.
    O motivo está no vault e não é técnico. Roteiro genérico na estreia queima a
    ferramenta, e ferramenta interna não ganha segunda chance porque não tem
    marketing pra convencer a voltar. */
export async function gerarRoteiro(opcoes: {
  postId: string;
  perfilId: string;
  localId: string | null;
  assunto: string;
  sentimento: string;
  pedido: string;
}): Promise<ResultadoIA> {
  if (!podeGerar(opcoes.perfilId)) {
    throw new ErroModelo(
      "Gerar roteiro ainda está desligado pra este perfil: a ficha de voz não foi preenchida. Ver a aba Inteligência.",
      { motivo: "sem-ficha" },
    );
  }

  const assunto = opcoes.assunto.trim();
  if (assunto === "") {
    throw new ErroModelo("Escreva pelo menos o assunto do vídeo.");
  }

  const entrada = [
    "BRIEFING",
    "",
    "Assunto: " + assunto,
    "O que a pessoa tem que sentir ou entender no fim: " +
      (opcoes.sentimento.trim() || "(não disseram, decida você o que faz mais sentido)"),
    "O pedido do vídeo: " + (opcoes.pedido.trim() || "(não disseram, escolha um só e mantenha)"),
  ].join("\n");

  return executar("gerar", {
    postId: opcoes.postId,
    perfilId: opcoes.perfilId,
    localId: opcoes.localId,
    entrada,
  });
}

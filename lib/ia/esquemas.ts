import { FORMATOS, FUNCOES_FALA, PILARES } from "@/lib/conteudo-tipos";

/* O formato que a IA é OBRIGADA a devolver.

   Isto é o que separa "pedir JSON no prompt" de saída estruturada de verdade: o
   schema vai na requisição (`response_format.schema`) e o modelo não consegue
   sair dele. A diferença aparece justamente nos campos de vocabulário fechado.

   ── Por que os enums importam mais que o resto ──

   `funcao`, `formato` e `pilar` têm lista fechada no painel, e o dropdown de
   cada um mostra rótulo e explicação. Se o modelo devolvesse `funcao:
   "abertura"`, o valor entraria no banco, o dropdown mostraria em branco, e
   ninguém saberia por quê. Seria dado errado com cara de dado certo, que é o
   princípio 12 do vault.

   Com o enum no schema, esse caso não existe. A validação em lib/ia/roteiro.ts
   continua lá assim mesmo, porque o schema é promessa do provedor e a promessa
   é do lado de fora.

   ── Uma saída só pras duas funções ──

   Importar e Gerar devolvem a MESMA estrutura (Yan, 22/08/2026: "saída de ambos
   vai ter que preencher tudo do roteiro"). O que muda é a instrução de sistema,
   não o formato. Isso vale a pena por dois motivos: a prévia, o validador e a
   escrita no editor são um código só, e trocar o Importar pelo Gerar não muda
   nada do que a Ge vê depois do clique. */

/* `enum` com "" incluído em vez de campo opcional: modelo lida melhor com "o
   valor pode ser vazio" do que com "o campo pode não existir", e do lado de cá
   string vazia e ausente são tratadas igual de qualquer jeito. */
const texto = (descricao: string) => ({ type: "string", description: descricao });

const escolha = (valores: readonly string[], descricao: string) => ({
  type: "string",
  enum: ["", ...valores],
  description: descricao,
});

export const ESQUEMA_FALA = {
  type: "object",
  properties: {
    texto: texto("A frase exata que vai ser falada em voz alta, do jeito que sai da boca."),
    funcao: escolha(
      FUNCOES_FALA,
      "Que trabalho esta frase faz na história: gancho segura quem ia passar, contexto situa a dor, virada muda a cabeça, prova sustenta, cta faz o único pedido.",
    ),
    enquadramento: texto("Como a câmera vê. Ex: close, plano médio, de costas."),
    cenario: texto("Onde a cena acontece, dentro do local escolhido pra gravação."),
    acao: texto("O que a pessoa está fazendo enquanto fala. Ex: andando, servindo o chá."),
    broll: texto("Imagem que entra por cima da fala, quando entra. Vazio se não precisa."),
    texto_tela: texto("O que aparece escrito na tela nesta fala. Vazio se nada aparece."),
    observacao: texto("Direção de tom, pausa ou intenção. Vazio quando não há nada a dizer."),
  },
  required: [
    "texto",
    "funcao",
    "enquadramento",
    "cenario",
    "acao",
    "broll",
    "texto_tela",
    "observacao",
  ],
} as const;

export const ESQUEMA_ROTEIRO = {
  type: "object",
  properties: {
    titulo: texto("Nome curto do post, pra reconhecer na lista. Não é o gancho."),
    legenda: texto("A legenda que vai junto da publicação."),
    hashtags: texto("Hashtags separadas por espaço, ou vazio."),
    formato: escolha(FORMATOS, "Que mídia é esta publicação."),
    pilar: escolha(PILARES, "Qual pilar de conteúdo esta publicação serve."),
    falas: {
      type: "array",
      description:
        "O roteiro, uma entrada por frase falada, na ordem em que vão ser ditas. A gravação é frase por frase, então cada item precisa ser uma frase que dá pra gravar de uma vez.",
      items: ESQUEMA_FALA,
    },
  },
  required: ["titulo", "legenda", "hashtags", "formato", "pilar", "falas"],
} as const;

/* Objeto simples e mutável na hora de mandar: o `as const` acima é ótimo pra
   tipar aqui dentro e péssimo pra passar como `Record<string, unknown>`. */
export function esquemaRoteiro(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(ESQUEMA_ROTEIRO));
}

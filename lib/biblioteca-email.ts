/* Espelho MANUAL do molde de e-mail da Biblioteca Oculta.

   Fonte única de verdade continua sendo `biblioteca-oculta/api/_email.js`.
   Copiado à mão em 28/08/2026, mesmo princípio do `catalogo-biblioteca.ts` e
   do manifesto de SEQUENCIAS em `app/painel/automacoes/page.tsx`: os dois
   repos não compartilham código nem dependência, são deploys independentes.

   POR QUE ESPELHAR EM VEZ DE BUSCAR NO AR: o HTML do e-mail só existe dentro
   de uma função serverless que exige um pedido pago pra rodar. Não há rota
   que devolva o molde, e criar uma seria abrir superfície nova em produção
   só pra alimentar um painel interno.

   SE O E-MAIL DE LÁ MUDAR, ESTE ARQUIVO PRECISA ACOMPANHAR À MÃO. O painel
   avisa a data do espelho na tela, pra que ninguém leia uma prévia velha
   achando que é o que está sendo enviado hoje. */

export const ESPELHADO_EM = "28/08/2026";

const SITE = "https://bibliotecaoculta.serenamentefeliz.com";

/* O molde real, caractere por caractere igual ao de `api/_email.js`.

   Ele é deliberadamente pobre: sem imagem, sem tabela de layout, sem web
   font. Isso NÃO é descuido de design, é escolha de entregabilidade escrita
   no comentário da função original: e-mail de entrega precisa CHEGAR, e
   quanto mais leve e mais parecido com mensagem escrita por gente, melhor
   passa em filtro. A atmosfera da casa mora no site, aqui mora a informação. */
function molde({
  titulo,
  corpo,
  url,
  rotuloBotao,
}: {
  titulo: string;
  corpo: string[];
  url: string;
  rotuloBotao: string;
}) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:#f5f3f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#26202e">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px 28px">
<h1 style="margin:0 0 18px;font-size:20px;font-weight:600;color:#16121c">${titulo}</h1>
${corpo.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${p}</p>`).join("")}
<p style="margin:26px 0 22px"><a href="${url}" style="display:inline-block;background:#4b2e83;color:#fff;text-decoration:none;padding:13px 24px;border-radius:5px;font-size:15px">${rotuloBotao}</a></p>
<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#5c5566">Se o botão não abrir, copie este endereço:</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5c5566;word-break:break-all">${url}</p>
<p style="margin:0;padding-top:18px;border-top:1px solid #e7e3ee;font-size:12px;line-height:1.6;color:#8b8496">Você recebeu este e-mail porque fez uma compra na Biblioteca Oculta. Este endereço envia apenas entrega de pedido e recuperação de acesso.</p>
</div></body></html>`;
}

export type EmailBiblioteca = {
  id: string;
  nome: string;
  quando: string;
  gatilho: string;
  assunto: string;
  remetente: string;
  html: string;
  /* O que NÃO dá pra medir hoje, e por quê. Campo existe pra que a tela diga
     isso na cara em vez de mostrar um zero que parece medição. */
  medicao: string;
};

/* Os dois e-mails usam nome e token de exemplo, marcados como exemplo na
   tela. Não puxo um pedido real: `bo_pedidos` guarda nome e e-mail de
   comprador, e prévia de layout não é motivo pra trazer dado de pessoa pra
   uma tela que a Ge e a Liz também abrem. */
const NOME_EXEMPLO = "Mariana Alves";
const TOKEN_EXEMPLO = "exemplo-de-token-do-pedido";

export const EMAILS_BIBLIOTECA: EmailBiblioteca[] = [
  {
    id: "acesso",
    nome: "Acesso liberado",
    quando: "Assim que o pagamento é confirmado",
    gatilho: "api/webhook-asaas.js, evento PAYMENT_CONFIRMED ou PAYMENT_RECEIVED",
    assunto: "Seu livro está liberado",
    remetente: "Biblioteca Oculta <entrega@bibliotecaoculta.serenamentefeliz.com>",
    medicao:
      "Medido pela coluna `acesso_enviado_em` de `bo_pedidos`, gravada só depois de um envio que deu certo. É por isso que o comprador recebe um e-mail só, mesmo com o Asaas reenviando o evento várias vezes.",
    html: molde({
      titulo: "Seu livro está liberado",
      corpo: [
        `Olá, ${NOME_EXEMPLO.split(" ")[0]}. Seu pagamento foi confirmado e seu livro está esperando por você.`,
        "<b>Guarde este e-mail.</b> É por ele que você volta aos seus livros em qualquer aparelho, quando quiser. O acesso é seu e não expira.",
      ],
      url: `${SITE}/entrega/?p=${encodeURIComponent(TOKEN_EXEMPLO)}`,
      rotuloBotao: "ABRIR MEU LIVRO",
    }),
  },
  {
    id: "recuperacao",
    nome: "Recuperação de acesso",
    quando: "Quando alguém pede o link de novo",
    gatilho: "api/recuperar.js, a pedido da pessoa",
    assunto: "Seu acesso à Biblioteca Oculta",
    remetente: "Biblioteca Oculta <entrega@bibliotecaoculta.serenamentefeliz.com>",
    medicao:
      "NÃO é medido hoje: `api/recuperar.js` reenvia o link e não grava nada em lugar nenhum. Não dá pra saber quantas pessoas perderam o acesso, que é justamente o número que diria se a entrega por e-mail está funcionando.",
    html: molde({
      titulo: "Seu acesso à Biblioteca Oculta",
      corpo: [
        `Olá, ${NOME_EXEMPLO.split(" ")[0]}. Você pediu o link dos seus livros.`,
        "É por este endereço que você volta aos seus livros, em qualquer aparelho.",
      ],
      url: `${SITE}/entrega/?p=${encodeURIComponent(TOKEN_EXEMPLO)}`,
      rotuloBotao: "ABRIR MEUS LIVROS",
    }),
  },
];

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
   achando que é o que está sendo enviado hoje.

   E O AVISO JÁ COBROU O QUE PROMETIA: em 29/08/2026 o molde de lá foi
   redesenhado e este espelho ficou pra trás por algumas horas. O Yan viu a
   prévia branca no painel e perguntou. Funcionou como rede, mas o custo do
   espelho manual é exatamente esse: alguém precisa lembrar. */

export const ESPELHADO_EM = "29/08/2026";

const SITE = "https://bibliotecaoculta.serenamentefeliz.com";

/* O molde real, caractere por caractere igual ao de `api/_email.js`.

   REDESENHADO EM 29/08/2026. Ele era branco e genérico, justificado por
   entregabilidade. A justificativa estava misturando duas coisas: o que custa
   entrega em filtro é imagem, anexo, encurtador e HTML sem alternativa em
   texto. Cor e fonte não movem spam score. E este é o primeiro contato depois
   do pagamento num nicho onde a objeção número um é "isso é golpe?", então
   recibo que não parece a loja aumenta a dúvida no pior momento.

   O que continua valendo, e não deve ser afrouxado: SEM IMAGEM (cliente de
   e-mail bloqueia por padrão), SEM WEB FONT (Gmail e Outlook removem
   `@font-face`, então Cinzel não renderiza de jeito nenhum e Georgia é a
   serifa que existe em todo aparelho), e SEMPRE com versão em texto puro.

   A estrutura é de TABELA porque o Outlook do Windows renderiza com o motor do
   Word, que ignora `max-width`, `border-radius` e background em `<div>`. Sem
   tabela, o fundo escuro vira texto claro sobre branco lá. */
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
  const SERIFA = "Georgia,'Times New Roman',Times,serif";
  const UI = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  const FUNDO = "#0b0710";
  const CARTAO = "#15101f";
  const FIO = "#2c2340";
  const PRATA = "#e6e1f0";
  const PRATA_FOSCO = "#a79fbd";
  const ROXO = "#5b3ba8";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${FUNDO};color:${PRATA}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FUNDO}" style="background:${FUNDO};margin:0;padding:0">
<tr><td align="center" style="padding:32px 16px">

<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:100%;background:${CARTAO};border:1px solid ${FIO}" bgcolor="${CARTAO}">

<tr><td align="center" style="padding:30px 30px 0">
<div style="font-family:${SERIFA};font-size:12px;letter-spacing:4px;color:${PRATA_FOSCO};text-transform:uppercase">Biblioteca Oculta</div>
<div style="font-size:1px;line-height:1px;height:22px">&nbsp;</div>
<div style="height:1px;background:${FIO};font-size:1px;line-height:1px">&nbsp;</div>
</td></tr>

<tr><td style="padding:26px 30px 0">
<h1 style="margin:0;font-family:${SERIFA};font-size:23px;font-weight:normal;line-height:1.3;color:${PRATA}">${titulo}</h1>
</td></tr>

<tr><td style="padding:16px 30px 0;font-family:${SERIFA};font-size:16px;line-height:1.65;color:${PRATA_FOSCO}">
${corpo.map((p) => `<p style="margin:0 0 15px">${p}</p>`).join("")}
</td></tr>

<tr><td align="center" style="padding:14px 30px 4px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${ROXO}" style="background:${ROXO};border:1px solid #7a5ccc">
<a href="${url}" style="display:block;padding:15px 30px;font-family:${SERIFA};font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:#ffffff;text-decoration:none">${rotuloBotao}</a>
</td></tr></table>
</td></tr>

<tr><td style="padding:24px 30px 0;font-family:${UI};font-size:12.5px;line-height:1.6;color:#8b83a3">
<p style="margin:0 0 5px">Se o botão não abrir, copie este endereço:</p>
<p style="margin:0;word-break:break-all"><a href="${url}" style="color:#9b8fc4;text-decoration:none">${url}</a></p>
</td></tr>

<tr><td style="padding:24px 30px 28px">
<div style="height:1px;background:${FIO};font-size:1px;line-height:1px">&nbsp;</div>
<p style="margin:16px 0 0;font-family:${UI};font-size:11.5px;line-height:1.6;color:#6f6889">Você recebeu este e-mail porque fez uma compra na Biblioteca Oculta. Este endereço envia apenas entrega de pedido e recuperação de acesso, nunca promoção.</p>
</td></tr>

</table>

<div style="font-family:${UI};font-size:11px;line-height:1.6;color:#565068;padding:18px 10px 0;max-width:520px">
Tradição popular brasileira de simpatias e rituais. Não substitui orientação médica, psicológica ou jurídica.
</div>

</td></tr>
</table>
</body></html>`;
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

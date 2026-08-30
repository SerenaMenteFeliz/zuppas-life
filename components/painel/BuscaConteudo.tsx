import Link from "next/link";

/* Busca por título na aba de Conteúdo (30/08/2026).

   Por que ela vem ANTES de "mais páginas" na ordem de importância: a Lista é a
   visão de comparar, e a partir de algumas dezenas de posts ninguém compara
   percorrendo página por página, procura pelo nome. Sem campo de busca, achar
   um post de junho é lembrar em que mês ele saiu e navegar até lá.

   Formulário GET nativo, sem estado de cliente: o termo vira `?q=` na URL como
   todo o resto do estado desta tela (visão, perfil, ordem), então o link é
   compartilhável, o botão voltar funciona e a página continua de servidor.

   Os campos escondidos preservam o resto do recorte ao buscar. `pag` fica de
   fora de propósito: busca nova começa na página 1, senão a pessoa busca e cai
   numa página vazia porque estava na 3 quando digitou. */
export default function BuscaConteudo({
  termo,
  preservar,
  hrefLimpar,
}: {
  termo?: string;
  preservar: Record<string, string | undefined>;
  hrefLimpar: string;
}) {
  return (
    <form action="/painel/conteudo" method="get" className="conteudo-busca">
      {Object.entries(preservar).map(([nome, valor]) =>
        valor ? <input key={nome} type="hidden" name={nome} value={valor} /> : null,
      )}

      <input
        type="search"
        name="q"
        defaultValue={termo ?? ""}
        placeholder="Buscar por título"
        aria-label="Buscar post por título"
        className="conteudo-busca-campo"
      />

      {/* Limpar é link e não botão de reset: reset devolveria o campo ao valor
          que veio do servidor (o próprio termo), não à lista sem filtro. */}
      {termo && (
        <Link href={hrefLimpar} className="conteudo-busca-limpar" aria-label="Limpar busca">
          ×
        </Link>
      )}
    </form>
  );
}

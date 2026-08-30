"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Fechar } from "@/components/icones";

/* Busca por título na aba de Conteúdo (30/08/2026).

   Por que ela vem antes de "mais páginas" na ordem de importância: a Lista é a
   visão de comparar, e a partir de algumas dezenas de posts ninguém compara
   percorrendo página por página, procura pelo nome. Sem campo de busca, achar
   um post de junho é lembrar em que mês ele saiu e navegar até lá.

   Formulário GET nativo: o termo vira `?q=` na URL como todo o resto do estado
   desta tela (visão, perfil, ordem), então o link é compartilhável, o botão
   voltar funciona e a página continua sendo de servidor. Enter submete.

   ── Por que é componente de cliente (30/08/2026, 2ª volta) ──

   Na primeira versão o botão de limpar só existia quando havia busca ATIVA, ou
   seja, depois de submeter. Digitar e desistir não oferecia saída nenhuma, que
   foi o que o Yan viu no print: campo com texto e nenhum jeito de limpar.

   O estado mínimo de cliente aqui é "tem texto no campo agora", que o servidor
   não tem como saber. Ele governa só a visibilidade do botão; o resultado da
   busca continua vindo inteiro da URL. */
export default function BuscaConteudo({
  termo,
  preservar,
  hrefLimpar,
}: {
  termo?: string;
  preservar: Record<string, string | undefined>;
  hrefLimpar: string;
}) {
  const router = useRouter();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(termo ?? "");
  const [termoVisto, setTermoVisto] = useState(termo);

  /* A URL manda. Voltar no navegador, limpar por outro caminho ou trocar de
     visão muda `termo`, e o campo tem que acompanhar: sem isto ele guardaria o
     texto de uma busca que não está mais valendo.

     Ajuste durante a renderização, e não `useEffect`: é o padrão que o React
     documenta pra estado derivado de prop, e o único que o lint aceita
     (`react-hooks/set-state-in-effect`). Sincronizar por efeito pintaria o
     valor velho uma vez antes de corrigir. */
  if (termo !== termoVisto) {
    setTermoVisto(termo);
    setTexto(termo ?? "");
  }

  const limpar = () => {
    setTexto("");
    /* Só navega se havia busca valendo. Se a pessoa só digitou e desistiu, a
       lista na tela já é a certa, e recarregar seria trabalho à toa. */
    if (termo) router.push(hrefLimpar);
    campo.current?.focus();
  };

  return (
    <form action="/painel/conteudo" method="get" className="conteudo-busca" role="search">
      {/* Preserva o resto do recorte ao buscar. `pag` fica de fora de
          propósito: busca nova começa na página 1, senão a pessoa busca e cai
          numa página vazia porque estava na 3 quando digitou. */}
      {Object.entries(preservar).map(([nome, valor]) =>
        valor ? <input key={nome} type="hidden" name={nome} value={valor} /> : null,
      )}

      <input
        ref={campo}
        type="search"
        name="q"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por título"
        aria-label="Buscar post por título"
        className="conteudo-busca-campo"
      />

      {/* Botão e não link: ele faz duas coisas (esvaziar o campo e, se havia
          busca, voltar pra lista inteira), e só uma delas é navegação.
          `type="button"` porque dentro de um form o padrão é submeter. */}
      {texto !== "" && (
        <button
          type="button"
          onClick={limpar}
          className="conteudo-busca-limpar"
          aria-label="Limpar busca"
        >
          <Fechar />
        </button>
      )}
    </form>
  );
}

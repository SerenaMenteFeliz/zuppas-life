"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { estiloDoPopover, usePopover } from "@/components/painel/usePopover";

/* Dropdown do painel: botão + lista (padrão ARIA listbox).

   ── Por que não continuar com `<select>` nativo ──

   A recomendação de acessibilidade é clara e é a favor do nativo: ele já vem
   com semântica, teclado e picker de celular de graça, e a orientação corrente
   é só trocar quando o nativo não dá conta do que a tela precisa. Aqui ele não
   dá, por dois motivos concretos:

   1. **O painel do `<select>` aberto é desenhado pelo sistema operacional.** Dá
      pra estilizar a caixa fechada e nada da lista: fonte, cor, raio de canto e
      espaçamento vêm do Windows. No meio de uma tela com vocabulário visual
      próprio, ele lê como uma peça de outro app (Yan, 22/08/2026).
   2. **`<option>` só aceita texto puro.** A lista de "função da fala" (gancho,
      contexto, virada, prova, CTA) é jargão de roteiro, e a pergunta "o que é
      função?" apareceu na primeira vez que alguém olhou a tela. Uma linha de
      explicação embaixo de cada opção resolve isso no lugar em que a dúvida
      nasce, e é exatamente o tipo de conteúdo que `<option>` não comporta.

   O preço é ter que reimplementar o teclado à mão, e é o que está abaixo: abrir
   com Enter/Espaço/setas, andar com ↑↓, ir aos extremos com Home/End, fechar
   com Escape (voltando o foco pro botão), Tab fecha e sai, e busca por letra
   digitada. Sem isso, um dropdown próprio é regressão, não melhoria.

   `aria-activedescendant` em vez de mover o foco de verdade: o foco fica no
   botão enquanto a lista está aberta, que é o que o padrão listbox pede e o
   que faz o Escape ter pra onde voltar.

   A LISTA é renderizada em `document.body` por portal, não ao lado do botão:
   dentro do quadro de conteúdo ela era cortada pelo container que rola. O
   porquê está em usePopover.ts. */

export type OpcaoDropdown = {
  valor: string;
  rotulo: string;
  /* Linha de apoio embaixo do rótulo. É a razão principal deste componente
     existir: explica o termo na hora de escolher, sem virar tooltip. */
  ajuda?: string;
  /* Bolinha colorida à esquerda (perfis no calendário usam cor como código). */
  cor?: string;
};

export default function Dropdown({
  valor,
  opcoes,
  aoEscolher,
  rotuloAcessivel,
  vazio = "Escolher",
  className = "",
  largura,
  compacto = false,
  icone,
}: {
  valor: string;
  opcoes: OpcaoDropdown[];
  aoEscolher: (valor: string) => void;
  rotuloAcessivel: string;
  /* Texto do botão quando nada está escolhido. */
  vazio?: string;
  className?: string;
  /* Largura do painel aberto quando ele precisa ser maior que o botão (opções
     com linha de ajuda ficam ilegíveis espremidas na largura de um chip). */
  largura?: number;
  /* Botão só com a seta, sem o texto da opção escolhida (30/08/2026).

     Existe pro card do quadro: ali o valor escolhido é o NOME DA COLUNA em que
     o card está, então escrever "Postado" dentro de um card que já mora na
     coluna Postado é dizer a mesma coisa duas vezes ocupando uma linha inteira.
     O controle vira só o gesto de mover, e o nome continua no `aria-label`,
     que é por onde o leitor de tela lê. */
  compacto?: boolean;
  /* Substitui a seta no modo compacto. O filtro de coluna da Lista usa um funil:
     seta ali leria como ordenação, que é o outro gesto do mesmo cabeçalho. */
  icone?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const idBase = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const pos = usePopover(botao, aberto, largura);
  /* Buffer da busca por digitação, com o instante da última tecla: duas letras
     seguidas buscam "ca", mas depois de uma pausa a segunda recomeça. */
  const busca = useRef({ texto: "", quando: 0 });

  const escolhida = opcoes.find((o) => o.valor === valor);
  const indiceAtual = Math.max(0, opcoes.findIndex((o) => o.valor === valor));

  const abrir = useCallback(
    (posicao?: number) => {
      setMarcado(posicao ?? indiceAtual);
      setAberto(true);
    },
    [indiceAtual]
  );

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }, []);

  /* Clique fora e rolagem fecham. `pointerdown` e não `click`: fechar só no
     clique completo deixa a lista aberta enquanto a pessoa arrasta pra
     selecionar texto em outro lugar da tela. */
  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e: PointerEvent) => {
      const alvo = e.target as Node;
      /* A lista mora em `document.body` por portal, então ela NÃO está dentro
         de `caixa`: sem checar as duas, clicar numa opção contava como "clicou
         fora" e fechava antes de escolher.

         A primeira tentativa foi `stopPropagation` na captura do `<ul>`, e era
         pior: no sistema de eventos do React, parar na captura impede o evento
         de chegar nos filhos, então nenhuma opção era clicável. */
      if (!caixa.current?.contains(alvo) && !lista.current?.contains(alvo)) {
        setAberto(false);
      }
    };
    document.addEventListener("pointerdown", foraDaCaixa);
    return () => document.removeEventListener("pointerdown", foraDaCaixa);
  }, [aberto]);

  /* Mantém a opção marcada dentro da área visível quando se anda com as setas
     numa lista mais alta que o painel. */
  useEffect(() => {
    if (!aberto) return;
    const el = lista.current?.children[marcado] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [aberto, marcado]);

  function porLetra(tecla: string) {
    const agora = Date.now();
    const texto = (agora - busca.current.quando < 600 ? busca.current.texto : "") + tecla.toLowerCase();
    busca.current = { texto, quando: agora };
    const achou = opcoes.findIndex((o) => o.rotulo.toLowerCase().startsWith(texto));
    if (achou >= 0) {
      if (aberto) setMarcado(achou);
      else aoEscolher(opcoes[achou].valor);
    }
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (aberto) {
        e.preventDefault();
        fechar();
      }
      return;
    }

    if (e.key === "Tab") {
      /* Tab fecha e segue o fluxo normal, sem devolver o foco pro botão: o
         objetivo de quem aperta Tab é sair daqui. */
      if (aberto) setAberto(false);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (aberto) {
        aoEscolher(opcoes[marcado].valor);
        fechar();
      } else {
        abrir();
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) return abrir();
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setMarcado((m) => Math.min(opcoes.length - 1, Math.max(0, m + passo)));
      return;
    }

    if (e.key === "Home" || e.key === "End") {
      if (!aberto) return;
      e.preventDefault();
      setMarcado(e.key === "Home" ? 0 : opcoes.length - 1);
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      porLetra(e.key);
    }
  }

  return (
    <div ref={caixa} className={"pn-drop " + className}>
      <button
        ref={botao}
        type="button"
        className={
          "pn-drop-botao" +
          (escolhida ? "" : " pn-drop-botao-vazio") +
          (compacto ? " pn-drop-botao-compacto" : "")
        }
        /* `role="combobox"` sobre o `<button>`: é o padrão do combobox
           "só seleção", e é o único role que aceita `aria-activedescendant`.
           Sem ele, o botão anuncia a lista mas não consegue dizer qual opção
           está sob a seta do teclado. */
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={idBase + "-lista"}
        aria-expanded={aberto}
        aria-label={rotuloAcessivel}
        aria-activedescendant={aberto ? idBase + "-" + marcado : undefined}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={aoTeclar}
      >
        {escolhida?.cor && (
          <span aria-hidden className="conteudo-ponto" style={{ background: escolhida.cor }} />
        )}
        {!compacto && <span className="pn-drop-texto">{escolhida?.rotulo ?? vazio}</span>}
        {icone ?? (
          <svg
            aria-hidden
            className="pn-drop-seta"
            viewBox="0 0 10 6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
        )}
      </button>

      {aberto &&
        pos &&
        createPortal(
        <ul
          ref={lista}
          id={idBase + "-lista"}
          role="listbox"
          tabIndex={-1}
          aria-label={rotuloAcessivel}
          className="theme-painel pn-drop-lista"
          style={estiloDoPopover(pos)}
        >
          {opcoes.map((o, i) => {
            const selecionada = o.valor === valor;
            return (
              <li
                key={o.valor}
                id={idBase + "-" + i}
                role="option"
                aria-selected={selecionada}
                className={
                  "pn-drop-item" +
                  (i === marcado ? " pn-drop-item-marcada" : "") +
                  (selecionada ? " pn-drop-item-escolhida" : "")
                }
                /* `pointerdown` também aqui, senão o listener de fora fecha a
                   lista antes de o clique chegar no item. */
                onPointerDown={(e) => {
                  e.preventDefault();
                  aoEscolher(o.valor);
                  fechar();
                }}
                onPointerEnter={() => setMarcado(i)}
              >
                {o.cor && <span aria-hidden className="conteudo-ponto" style={{ background: o.cor }} />}
                <span className="pn-drop-item-texto">
                  <span className="pn-drop-item-rotulo">{o.rotulo}</span>
                  {o.ajuda && <span className="pn-drop-item-ajuda">{o.ajuda}</span>}
                </span>
                {selecionada && (
                  <svg
                    aria-hidden
                    className="pn-drop-item-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}

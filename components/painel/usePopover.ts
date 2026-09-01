"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/* Posição de um painel flutuante que vive fora do fluxo da página.

   ── O bug que isto resolve (22/08/2026) ──

   O quadro de conteúdo tem `overflow-x: auto` pra rolar as colunas de lado.
   Pela especificação, um container com overflow `auto` num eixo passa a ser
   `auto` no outro também: ele vira um contexto de recorte NOS DOIS SENTIDOS.
   Resultado: o dropdown de status dentro de um card do quadro abria e era
   cortado pela borda da coluna, com barra de rolagem própria aparecendo no
   meio da lista.

   `position: absolute` não escapa disso, porque o recorte é do ancestral que
   rola, não do posicionamento. `overflow: visible` no quadro tiraria a rolagem
   horizontal, que é o que faz as seis colunas caberem. Sobra tirar o painel do
   container: ele é renderizado em `document.body` por portal e posicionado com
   `position: fixed` a partir das coordenadas do botão.

   ── Por que reposicionar em scroll e resize ──

   Coordenada de `fixed` é tirada do viewport, então ela envelhece assim que
   qualquer coisa rola. Sem os listeners, o painel ficaria parado enquanto a
   página anda embaixo dele. `capture: true` no scroll porque quem rola é o
   `.painel-main` e as colunas do quadro, não a janela: sem capturar, o evento
   desses containers nunca chegaria aqui.

   ── Quem portala tem que levar `theme-painel` junto (01/09/2026) ──

   O `<html>` do app inteiro é `.theme-casa` e o painel é `.theme-painel` num
   div interno (app/painel/layout.tsx). Sair pro `document.body` é sair do
   painel: o popover passa a ler as variáveis do tema da FAMÍLIA, e as da
   escala de 30/08 (`--esp-*`, `--raio-*`, `--txt-*`), que só existem dentro do
   `.theme-painel`, deixam de existir.

   O sintoma não parece um bug de tema, parece descuido de CSS: `var()`
   indefinido invalida a declaração inteira, então `padding: var(--esp-2) ...`
   vira padding zero e `border-radius: var(--raio-sm)` vira canto reto. Foi
   assim que a dica do quadro apareceu como um retângulo preto colado no texto,
   e é o mesmo motivo de o dropdown estar com acento verde num painel roxo.

   Por isso todo elemento portalado daqui carrega `theme-painel` na própria
   className. A classe só declara variáveis, nada visual, então adicionar não
   muda mais nada. */

export type Posicao = {
  top: number;
  left: number;
  /** Largura mínima do painel: no mínimo a do botão, pra não ficar mais estreito
      que o controle que o abriu. */
  minWidth: number;
  /** Espaço disponível abaixo do botão; o painel usa pra limitar a própria
      altura em vez de vazar pra fora da tela. */
  maxHeight: number;
  /** Verdadeiro quando não coube embaixo e o painel foi jogado pra cima. */
  paraCima: boolean;
};

export function usePopover(
  ancora: RefObject<HTMLElement | null>,
  aberto: boolean,
  larguraDesejada?: number,
): Posicao | null {
  const [pos, setPos] = useState<Posicao | null>(null);

  useLayoutEffect(() => {
    /* Fechado não zera a posição, só para de medir. Zerar seria um `setState`
       dentro do efeito sem necessidade (o painel nem está na tela), e a posição
       velha nunca chega a ser pintada: `useLayoutEffect` roda depois do commit
       e ANTES da pintura, então a medição nova entra no mesmo quadro em que o
       painel reaparece. */
    if (!aberto) return;

    const medir = () => {
      const el = ancora.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const folga = 8;
      const abaixo = window.innerHeight - r.bottom - folga;
      const acima = r.top - folga;
      /* Abre pra cima só quando embaixo não cabe o mínimo razoável E em cima
         cabe mais: um painel de 3 linhas não precisa saltar pro outro lado só
         porque o botão está a 200px do fim da tela. */
      const paraCima = abaixo < 200 && acima > abaixo;
      const largura = Math.max(r.width, larguraDesejada ?? 0);

      /* Prende dentro da janela pelos lados: botão perto da borda direita (o
         "+ Criar" do topo, o status do último card do quadro) abriria um painel
         com metade pra fora. */
      const left = Math.min(Math.max(8, r.left), window.innerWidth - largura - 8);

      setPos({
        top: paraCima ? r.top - 4 : r.bottom + 4,
        left,
        minWidth: largura,
        maxHeight: Math.max(160, paraCima ? acima : abaixo),
        paraCima,
      });
    };

    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [ancora, aberto, larguraDesejada]);

  return pos;
}

/** Estilo pronto pro painel, já com a inversão quando ele abre pra cima.

    `larguraEhTeto` inverte o papel da largura desejada: em vez de piso
    (dropdown nunca mais estreito que o botão que o abriu), ela vira teto. É o
    que uma dica quer: "No ar, com link" não pode ocupar os mesmos 210px de uma
    frase de duas linhas só porque o teto de quebra é 210. A posição continua
    sendo calculada com a largura cheia, então uma dica encostada na borda
    direita da tela segue cabendo. */
export function estiloDoPopover(p: Posicao, larguraEhTeto = false): React.CSSProperties {
  return {
    position: "fixed",
    top: p.paraCima ? undefined : p.top,
    bottom: p.paraCima ? window.innerHeight - p.top : undefined,
    left: p.left,
    minWidth: larguraEhTeto ? undefined : p.minWidth,
    maxWidth: larguraEhTeto ? p.minWidth : undefined,
    maxHeight: p.maxHeight,
  };
}

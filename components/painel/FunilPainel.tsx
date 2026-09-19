"use client";

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Vazio } from "@/components/ui";
import type { EtapaContagem, EtapaGaleria } from "./Funil";
import { curta } from "@/lib/datas";
import type { SemanaLeads } from "@/lib/painel-funis";

/* Peças do detalhe de funil redesenhado em 11/09/2026, começando pelo Método
   Cálice (Biblioteca e Lar Interior migram depois e aí `FunilPreview`/
   `GaleriaFunil` podem sair).

   O que motivou, medido na tela em produção: o preview de 684px ocupava o
   centro e os números vinham embaixo, em 19 cards de rolagem lateral dos quais
   cabiam 8. Uma etapa que perdia 36% tinha a mesma cara de uma que perdia 0,6%.
   Aqui o funil vira LISTA, que é o formato de uma sequência: a barra encurta
   onde a sequência afina, e o olho acha a queda antes de ler número. O preview
   continua (pedido do Yan: "o preview tem que manter"), fixo à direita.

   Nenhuma métrica do card antigo saiu: contagem, % do início, passagem pra
   próxima e perda estão todas na linha. A % do início mora ao lado da
   contagem, não em coluna própria (Yan, 11/09/2026): a barra já desenha
   exatamente essa proporção, então a coluna separada repetia a barra em
   número e custava largura. */

/** Cabeçalho da coluna de contagem. Cada linha conta quem VIU aquela tela, e
    não quem deixou e-mail: o card "Leads" do topo (126 em 11/09/2026) é o
    lead no sentido do banco, e esta coluna mostra 384 na abertura. O Yan
    escolheu "Leads" sabendo da diferença (11/09/2026). */
const ROTULO_CONTAGEM = "Leads";

/** O que cada tela FAZ, dito embaixo do nome dela (18/09/2026, pedido do Yan).

    O nome diz o que tem naquela tela ("Receber elogio"); a tag diz o papel
    dela. Juntas, dá pra ler a FORMA do funil de cima a baixo sem abrir
    nenhuma tela: quantas seleções seguidas, onde entra uma transição pra
    segurar a pessoa, e onde está o paywall.

    Os quatro primeiros são o vocabulário do V2, dito pelo Yan. As outras três
    existem pelas telas que o V1 tem e o V2 não. `captura` é a tela de e-mail, e
    é o nome que o Yan deu a ela em 18/09/2026: não é "entrada" genérica, é o
    momento em que a pessoa vira lead, e o funil inteiro do V1 existe em função
    dele. A tela de nome fica em `entrada` porque ela não captura ninguém: serve
    pra personalizar o texto das telas seguintes. Tela sem tipo (o "Material
    entregue", que é etapa anexada e não tela do quiz) não recebe tag. */
const TAG_POR_TIPO: Record<string, string> = {
  abertura: "start quiz",
  pergunta: "seleção",
  pausa: "transição",
  calculando: "transição",
  revelacao: "transição",
  oferta: "paywall",
  nome: "entrada",
  captura: "captura",
  resultado: "resultado",
};

/** A partir de quanto a perda entre duas telas ganha cor. Com o funil de
    11/09, marca 4 das 19 linhas (abertura, nome, captura, resultado), que são
    exatamente as que mudam alguma coisa se forem melhoradas. */
const PERDA_FORTE = 15;

function pct(valor: number) {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function FunilTelas({
  etapas,
  previewUrls,
  urlInicial,
  vazio,
}: {
  etapas: EtapaGaleria[];
  previewUrls: (string | null)[];
  urlInicial: string;
  vazio: string;
}) {
  const [ativo, setAtivo] = useState(0);
  const linhas = useRef<(HTMLButtonElement | null)[]>([]);
  const preview = useRef<HTMLElement | null>(null);

  if (etapas.length === 0) return <Vazio>{vazio}</Vazio>;
  /* Tela sem visita nenhuma continua listada, com preview (12/09/2026): uma
     variante em rascunho não tem tráfego, e é justamente nela que se quer ver
     as telas antes de soltar. Antes a lista inteira virava o aviso de vazio. */
  const semVisita = etapas.every((e) => e.views === 0);

  const topo = etapas[0].views || 1;
  const maior = Math.max(...etapas.map((e) => e.views), 1);
  const etapaAtual = etapas[ativo];

  function selecionar(i: number, focar = false) {
    const destino = Math.max(0, Math.min(etapas.length - 1, i));
    setAtivo(destino);
    if (focar) linhas.current[destino]?.focus();
    // Empilhado (tela estreita), o preview fica embaixo da lista: sem levar a
    // pessoa até ele, o clique parece não ter feito nada.
    if (!focar && window.matchMedia("(max-width: 1023px)").matches) {
      preview.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function aoTeclar(e: ReactKeyboardEvent, i: number) {
    const passo = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (passo) {
      e.preventDefault();
      selecionar(i + passo, true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      selecionar(e.key === "Home" ? 0 : etapas.length - 1, true);
    }
  }

  return (
    <div className="funil-duplo">
      <div className="glass-card funil-lista funil-lista-telas">
        <div className="funil-linha funil-linha-cabeca" aria-hidden>
          <span>Etapa</span>
          <span>{ROTULO_CONTAGEM}</span>
          <span>Passagem</span>
          <span>Perda</span>
        </div>

        {etapas.map((etapa, i) => {
          // Passagem e perda ficam na etapa de ORIGEM (o que aconteceu depois
          // desta tela), igual ao card antigo desde o achado de 04/08.
          const proxima = i < etapas.length - 1 ? etapas[i + 1].views : null;
          const passagem = proxima !== null && etapa.views > 0 ? (proxima / etapa.views) * 100 : null;
          const perda = passagem !== null ? 100 - passagem : null;
          const selecionada = ativo === i;

          return (
            <button
              key={`${etapa.label}-${i}`}
              ref={(el) => {
                linhas.current[i] = el;
              }}
              type="button"
              className={`funil-linha${selecionada ? " funil-linha-ativa" : ""}`}
              aria-current={selecionada ? "step" : undefined}
              onClick={() => selecionar(i)}
              onKeyDown={(e) => aoTeclar(e, i)}
            >
              <span className="funil-linha-etapa">
                <span className="funil-linha-n">{i + 1}</span>
                <span className="funil-linha-titulo">
                  <span className="funil-linha-nome">{etapa.label}</span>
                  {etapa.tipo && TAG_POR_TIPO[etapa.tipo] && (
                    <span className="funil-linha-tag">{TAG_POR_TIPO[etapa.tipo]}</span>
                  )}
                </span>
              </span>
              <span className="funil-linha-contagem">
                <span className="funil-linha-barra" aria-hidden>
                  <span style={{ width: `${(etapa.views / maior) * 100}%` }} />
                </span>
                <span className="funil-linha-num">{etapa.views}</span>
                <span className="funil-linha-doinicio" title="do início">
                  {pct((etapa.views / topo) * 100)}
                </span>
              </span>
              <span className="funil-linha-apoio">{passagem === null ? "—" : pct(passagem)}</span>
              <span
                className={`funil-linha-perda${perda !== null && perda >= PERDA_FORTE ? " funil-linha-perda-forte" : ""}`}
              >
                {perda === null ? "—" : pct(perda)}
              </span>
            </button>
          );
        })}

        <p className="funil-lista-rodape">
          {semVisita ? `${vazio} ` : ""}↑ e ↓ andam pelas telas. Perda de {PERDA_FORTE}% ou mais fica em destaque.
        </p>
      </div>

      <aside
        ref={(el) => {
          preview.current = el;
        }}
        className="funil-duplo-preview"
      >
        <div className="painel-preview-panel glass-card funil-preview">
          <div className="painel-preview-header">
            Etapa {ativo + 1} de {etapas.length} · {etapaAtual.label}
          </div>
          <div className="painel-preview-frame">
            <iframe src={previewUrls[ativo] ?? urlInicial} title={etapaAtual.label} />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** O funil de cima da tela: poucas etapas, uma fileira só.

    Substitui o `FunilEtapas` no detalhe do Cálice (18/09/2026). O problema não
    era o `FunilEtapas` estar feio, era a mesma tela desenhar o mesmo objeto
    (uma sequência que afina) de dois jeitos: em cima, caixas com número em
    serifa grande e uma seta com a porcentagem solta entre elas; embaixo, a
    lista com barra proporcional. Aqui cada etapa ganha a barra da lista, então
    os dois blocos dizem "afinou aqui" com o mesmo traço.

    A passagem fica na etapa de ORIGEM, mesma convenção do resto do arquivo
    (04/08/2026): "67% seguiram" descreve o que aconteceu DEPOIS desta etapa. */
export function ResumoFunil({ etapas, vazio }: { etapas: EtapaContagem[]; vazio: string }) {
  if (etapas.length === 0 || etapas.every((e) => e.count === 0)) return <Vazio>{vazio}</Vazio>;

  const base = etapas[0].count || 1;

  return (
    <div className="glass-card funil-resumo">
      {etapas.map((etapa, i) => {
        const proxima = i < etapas.length - 1 ? etapas[i + 1].count : null;
        const passagem = proxima !== null && etapa.count > 0 ? (proxima / etapa.count) * 100 : null;
        const doInicio = (etapa.count / base) * 100;

        return (
          <div key={`${etapa.label}-${i}`} className="funil-resumo-etapa">
            <span className="painel-metrica-rotulo">{etapa.label}</span>
            <span className="funil-resumo-topo">
              <span className="funil-resumo-valor">{etapa.count}</span>
              {/* A primeira etapa também diz "100% do início", e não "(base)": a
                  coluna inteira passa a ser a mesma frase, e aí dá pra ler os
                  quatro números em sequência sem trocar de gramática no meio. */}
              <span className="funil-resumo-doinicio">{pct(doInicio)} do início</span>
            </span>
            <span className="funil-linha-barra" aria-hidden>
              <span style={{ width: `${doInicio}%` }} />
            </span>
            <span className="funil-resumo-passagem">
              {passagem === null ? "" : `${pct(passagem)} seguiram`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Distribuição de uma coisa entre categorias (origem, arquétipo), no mesmo
    desenho de barra da lista de telas, pra tela inteira falar uma língua só. */
export function Distribuicao({ itens, vazio }: { itens: EtapaContagem[]; vazio: string }) {
  const total = itens.reduce((soma, i) => soma + i.count, 0);
  if (total === 0) return <Vazio>{vazio}</Vazio>;
  const maior = Math.max(...itens.map((i) => i.count));

  return (
    <div className="glass-card funil-lista">
      {itens.map((item) => (
        <div key={item.label} className="funil-dist">
          <span className="funil-linha-nome">{item.label}</span>
          <span className="funil-linha-barra" aria-hidden>
            <span style={{ width: `${(item.count / maior) * 100}%` }} />
          </span>
          <span className="funil-linha-num">{item.count}</span>
          <span className="funil-linha-apoio">{pct((item.count / total) * 100)}</span>
        </div>
      ))}
    </div>
  );
}

/** Barrinhas de leads por semana. Semana incompleta (a de hoje, ou uma que o
    filtro corta) vem mais clara: sem essa marca, toda segunda-feira parece uma
    queda. */
export function BarrasSemana({ semanas }: { semanas: SemanaLeads[] }) {
  if (semanas.length === 0) return null;
  const maior = Math.max(...semanas.map((s) => s.count), 1);

  return (
    <div className="funil-semanas" role="img" aria-label="Leads por semana">
      {semanas.map((s) => (
        <span
          key={s.inicio}
          className={`funil-semana${s.completa ? "" : " funil-semana-parcial"}`}
          style={{ height: `${Math.max((s.count / maior) * 100, 4)}%` }}
          title={`Semana de ${curta(s.inicio)}: ${s.count} lead${s.count === 1 ? "" : "s"}${
            s.atual ? " (em andamento)" : s.completa ? "" : " (cortada pelo período)"
          }`}
        />
      ))}
    </div>
  );
}

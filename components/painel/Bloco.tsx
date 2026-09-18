import type { ReactNode } from "react";

/* As peças padrão de uma tela do painel (18/09/2026).

   Três coisas, e quase toda tela do painel é feita só delas: a seção, a nota
   de rodapé e a métrica. Ver o bloco "Blocos padrão de uma tela do painel" em
   app/globals.css pro porquê de cada uma.

   Componentes de servidor de propósito: nenhum deles tem estado, e tornar
   `Secao` cliente obrigaria toda tela que a usa a mandar o conteúdo dela pelo
   RSC como children serializado sem motivo.

   Não confundir com `Rotulo` de components/ui.tsx: aquele é da linguagem da
   família (casa, TV, semana) e usa `.tv-rotulo`, que cresce com a largura da
   janela. Bom numa TV a três metros, errado num dashboard. */

/** Um bloco de uma tela: rótulo, conteúdo, e a nota que explica o conteúdo.

    A nota entra por prop e não como children solto porque era exatamente aí
    que a tela antiga escorregava: cada seção escrevia o próprio
    `<p className="mt-2 text-xs">`, com margem escolhida na hora, e uma delas
    precisou de `-mt-4` pra desfazer a margem da seção de cima. Nota é parte da
    seção, então a seção é quem sabe onde ela fica. */
export function Secao({
  titulo,
  acao,
  nota,
  children,
}: {
  titulo: ReactNode;
  /** Controle da própria seção (não da tela: esse vive no PainelTopo). */
  acao?: ReactNode;
  nota?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="painel-secao">
      <div className="painel-secao-cabeca">
        <h2 className="painel-rotulo">{titulo}</h2>
        {acao}
      </div>
      {children}
      {nota}
    </section>
  );
}

/** Nota de rodapé de um bloco.

    `tom="atencao"` é para uma coisa só: o número acima está errado, ou mente
    de um jeito conhecido, e quem ler sem saber disso vai decidir errado. Tudo
    o mais (de onde vem a coluna, o que conta como início) é `leitura`.

    A distinção existe porque na tela antiga "o arquétipo vem do primeiro
    opt-in" e "estes leads não aparecem até a migration rodar" tinham o mesmo
    cinza, no mesmo tamanho, na mesma posição. */
export function Nota({ children, tom = "leitura" }: { children: ReactNode; tom?: "leitura" | "atencao" }) {
  return <p className={`painel-nota${tom === "atencao" ? " painel-nota-atencao" : ""}`}>{children}</p>;
}

/** Rótulo, número, e uma linha dizendo de onde o número vem.

    `apoio` não é opcional por preguiça de tipo: é opcional porque numa tabela,
    onde a coluna já disse o que o número é, repetir a origem em toda linha
    seria ruído. Fora de tabela, preencher. */
export function Metrica({
  rotulo,
  valor,
  apoio,
  children,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  apoio?: ReactNode;
  /** Entra entre o valor e o apoio (a sparkline de leads por semana, hoje). */
  children?: ReactNode;
}) {
  return (
    <div className="painel-metrica">
      <span className="painel-metrica-rotulo">{rotulo}</span>
      {children ? (
        <div className="flex items-end justify-between gap-3">
          <span className="painel-metrica-valor">{valor}</span>
          {children}
        </div>
      ) : (
        <span className="painel-metrica-valor">{valor}</span>
      )}
      {apoio && <span className="painel-metrica-apoio">{apoio}</span>}
    </div>
  );
}

/** A métrica dentro de um card próprio, que é como ela aparece na faixa de
    números do topo de uma tela. Envolver à mão daria a cada tela a chance de
    escolher outro padding. */
export function Kpi(props: Parameters<typeof Metrica>[0]) {
  return (
    <div className="glass-card painel-kpi">
      <Metrica {...props} />
    </div>
  );
}

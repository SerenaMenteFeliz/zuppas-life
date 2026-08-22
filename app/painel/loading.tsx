/* Esqueleto de carregamento de qualquer tela do painel (22/08/2026).

   Toda tela daqui é `force-dynamic` e consulta o banco a cada visita. Mesmo
   depois de a latência cair pra 0,12-0,30s (funções fixadas em `gru1`, ver
   lib/conteudo.ts), sem NENHUM sinal a tela fica parada no conteúdo antigo e
   parece que o clique não pegou — e a pessoa clica de novo, o que é pior que
   esperar.

   Esqueleto em vez de "carregando...": mantém a faixa de topo e a área de
   conteúdo no mesmo lugar, então a tela não pisca de vazia pra cheia. As
   proporções são só sugestão de forma, não promessa do que vem. */
export default function CarregandoPainel() {
  return (
    <>
      <div className="painel-topo">
        <div className="painel-topo-linha">
          <span className="pn-esqueleto" style={{ width: 110, height: 20 }} />
          <span aria-hidden className="painel-topo-divisor" />
          <span className="pn-esqueleto" style={{ width: 220, height: 32 }} />
          <span className="pn-esqueleto" style={{ width: 90, height: 32, marginLeft: "auto" }} />
        </div>
      </div>

      <div className="painel-conteudo" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando</span>
        <div className="pn-esqueleto-grade">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="pn-esqueleto-coluna">
              <span className="pn-esqueleto" style={{ width: "55%", height: 14 }} />
              <span className="pn-esqueleto" style={{ width: "80%", height: 10 }} />
              <span className="pn-esqueleto" style={{ height: 76, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

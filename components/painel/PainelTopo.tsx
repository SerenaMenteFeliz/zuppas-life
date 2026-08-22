import Link from "next/link";

/* Faixa fixa no topo de cada seção do painel (22/08/2026).

   Antes, cada tela abria com um letreiro grande e estático ("Funis",
   "Conteúdo") e os controles da seção vinham numa segunda linha, no corpo da
   página, rolando junto com o conteúdo. Duas coisas erradas nisso:

   1. **O letreiro repetia o que a sidebar já diz.** Quem está em /painel/conteudo
      tem "Conteúdo" aceso na sidebar; um título de 3rem no corpo é gasto de
      altura pra informação que a pessoa já tem.
   2. **Os controles sumiam ao rolar.** Trocar de visão ou de perfil é o gesto
      mais frequente da tela, e exigia voltar ao topo pra alcançar.

   Agora é uma faixa só, fixa: rótulo pequeno da seção, os controles dela, e a
   ação principal empurrada pro canto direito. Serve pra lista e pra detalhe —
   no detalhe, `voltar` vira a migalha em cima do título.

   **Fica FORA do `max-width` do conteúdo, de propósito.** A faixa cobre a
   largura inteira da área principal; o conteúdo embaixo continua centralizado
   no limite de leitura de cada tela. Medido em 22/08/2026 num monitor de
   3200px: dentro do wrapper, a barra parava com o conteúdo e virava uma tarja
   flutuando no meio da tela, com metade da área principal descoberta dos dois
   lados. Barra de topo de painel é moldura da janela, não coluna de texto.

   Componente de servidor de propósito: ele só posiciona. Quem precisa de
   estado (o dropdown de perfil, o indicador de autosave) entra como `children`
   ou como `acoes`, já sendo componente de cliente por conta própria. */
export default function PainelTopo({
  titulo,
  voltar,
  controles,
  acoes,
}: {
  titulo: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  controles?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  /* Sem prop de largura (22/08/2026): a linha de controles e a coluna de
     conteúdo leem `--painel-largura` do tema, então é impossível uma tela
     nascer com um limite diferente do resto do painel por esquecimento. */
  return (
    <header className="painel-topo">
      <div className="painel-topo-linha">
        <div className="painel-topo-titulo">
          <div className="min-w-0">
            {voltar && (
              <Link href={voltar.href} className="painel-topo-volta">
                ‹ {voltar.rotulo}
              </Link>
            )}
            <h1 className="painel-topo-titulo-texto">{titulo}</h1>
          </div>
        </div>

        {controles && (
          <>
            <span aria-hidden className="painel-topo-divisor" />
            <div className="painel-topo-controles">{controles}</div>
          </>
        )}

        {acoes && <div className="painel-topo-acoes">{acoes}</div>}
      </div>
    </header>
  );
}

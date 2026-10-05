import QuadroTV from "@/components/quadro/QuadroTV";

/* O endereço que a TV abre: o Quadro ocupando a tela inteira, sem barra de
   navegação (a Nav se esconde aqui). Em tela cheia numa TV Full HD a moldura
   tem escala 1 e some. */

export default function QuadroNaTV() {
  return (
    <main className="quadro-pagina-tv">
      <QuadroTV />
    </main>
  );
}

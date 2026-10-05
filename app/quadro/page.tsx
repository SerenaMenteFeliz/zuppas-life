import QuadroTV from "@/components/quadro/QuadroTV";

/* Quadro da semana, visto no PC: a mesma tela da TV dentro de uma moldura
   16:9, com a barra de navegação embaixo. É o simulador da TV.
   Na TV de verdade, abrir /quadro/tv (sem barra) em tela cheia. */

export default function Quadro() {
  return (
    <main className="quadro-pagina">
      <QuadroTV />
    </main>
  );
}

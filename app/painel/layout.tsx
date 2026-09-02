import type { Metadata } from "next";
import PainelCasca from "@/components/painel/PainelCasca";

/* Casca do painel interno, com o tema escuro próprio (.theme-painel, ver
   app/globals.css). Nada de <Nav> nem de barra mobile da família aqui: este
   layout substitui a casca inteira só pra tudo debaixo de /painel (proteção
   real fica em middleware.ts, não aqui).

   Qual casca exatamente (com sidebar ou tela cheia, na gravação) é decisão do
   `PainelCasca`, que precisa saber a rota. Este arquivo continua sendo
   componente de servidor pra poder exportar o `metadata` abaixo. */

export const metadata: Metadata = {
  title: "Painel · Zuppas",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <PainelCasca>{children}</PainelCasca>;
}

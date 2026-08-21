import type { Metadata } from "next";
import Avisos from "@/components/painel/Avisos";
import Sidebar from "@/components/painel/Sidebar";

/* Casca do painel interno — sidebar fixa + tema escuro próprio (.theme-painel,
   ver app/globals.css). Nada de <Nav> nem de barra mobile da família aqui:
   este layout substitui a casca inteira só pra tudo debaixo de /painel
   (proteção real fica em middleware.ts, não aqui). */

export const metadata: Metadata = {
  title: "Painel · Zuppas",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-painel painel-bg">
      <div className="painel-shell">
        <Sidebar />
        <main className="painel-main">{children}</main>
      </div>
      {/* Fica na casca e não em cada tela: aviso disparado antes de uma
          navegação precisa de alguém escutando do outro lado dela. */}
      <Avisos />
    </div>
  );
}

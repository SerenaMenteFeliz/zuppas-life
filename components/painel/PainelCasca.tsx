"use client";

import { usePathname } from "next/navigation";
import Avisos from "@/components/painel/Avisos";
import Sidebar from "@/components/painel/Sidebar";

/* Qual casca o painel veste, decidido pela rota (02/09/2026).

   Quase toda tela do painel veste a casca cheia: sidebar de navegação à
   esquerda e a área principal rolando ao lado. A tela de gravação é a exceção,
   e ela não é exceção por gosto.

   A gravação acontece com o celular em tela dividida: a câmera ocupa metade e
   o roteiro ocupa a outra, ou seja, mais ou menos um quadrado de 390x400.
   Medido nesse tamanho em 02/09/2026, ANTES desta tela existir: a faixa de
   navegação comia 80px e a barra de topo do post outros 71px, então 38% da
   altura ia embora em moldura, e a primeira fala só aparecia depois de 980px
   de rolagem, passados o título, o perfil, o status, o formato, o pilar, a
   legenda e as hashtags.

   Vestir a casca cheia ali seria gastar o recurso mais escasso da tela (altura)
   com links que ninguém aperta no meio de uma tomada. Então a gravação recebe a
   página inteira, e a única saída dela é o "‹" que volta pro post.

   Isto é um componente de cliente porque a decisão depende do caminho. O layout
   continua sendo componente de servidor, e é ele que exporta o `metadata`. */

export default function PainelCasca({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const gravando = caminho.endsWith("/gravar");

  return (
    <div className="theme-painel painel-bg">
      {gravando ? (
        children
      ) : (
        <div className="painel-shell">
          <Sidebar />
          <main className="painel-main">{children}</main>
        </div>
      )}
      {/* Fica na casca e não em cada tela: aviso disparado antes de uma
          navegação precisa de alguém escutando do outro lado dela. */}
      <Avisos />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Claquete, Funil, Raio } from "@/components/icones";

/* Sidebar do painel interno — só pro Yan (ver middleware.ts). Diferente da
   Nav da família (5 destinos fixos, barra embaixo no celular): aqui é
   plataforma que vai crescer, então a lista é um array simples de propósito
   — adicionar a próxima seção é uma linha aqui, não um redesenho. */

const DESTINOS = [
  { href: "/painel/funis", rotulo: "Funis", Icone: Funil },
  { href: "/painel/automacoes", rotulo: "Automações", Icone: Raio },
  { href: "/painel/conteudo", rotulo: "Conteúdo", Icone: Claquete },
];

export default function Sidebar() {
  const caminho = usePathname();

  return (
    <aside className="painel-sidebar">
      {/* "Painel" era o nome da rota, não o nome da coisa (Yan, 22/08/2026):
          quem abre isso está no Zuppas Life, e Serena Mente Feliz é o negócio
          que o painel enxerga. Com a Ge e a Liz recebendo o link, o topo da
          sidebar é o único lugar que diz em que ferramenta elas estão. */}
      <div className="painel-marca">
        Zuppas Life
        <span className="painel-marca-sub">Serena Mente Feliz</span>
      </div>
      <nav className="painel-nav">
        {DESTINOS.map(({ href, rotulo, Icone }) => {
          const ativo = caminho.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`painel-nav-item ${ativo ? "painel-nav-item-ativo" : ""}`}
              aria-current={ativo ? "page" : undefined}
            >
              <Icone className="h-[18px] w-[18px]" />
              <span>{rotulo}</span>
            </Link>
          );
        })}
      </nav>

      {/* O layout do painel troca a casca inteira, então sem este link o
          /painel é beco sem saída: não dá pra voltar pra rotina da família a
          não ser editando a URL. Fica no rodapé e discreto porque é saída, não
          destino. */}
      <Link href="/" className="painel-sidebar-saida">
        ‹ Rotina da família
      </Link>
    </aside>
  );
}

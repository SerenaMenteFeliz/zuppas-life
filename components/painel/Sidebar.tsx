"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Funil, Raio } from "@/components/icones";

/* Sidebar do painel interno — só pro Yan (ver middleware.ts). Diferente da
   Nav da família (5 destinos fixos, barra embaixo no celular): aqui é
   plataforma que vai crescer, então a lista é um array simples de propósito
   — adicionar a próxima seção é uma linha aqui, não um redesenho. */

const DESTINOS = [
  { href: "/painel/funis", rotulo: "Funis", Icone: Funil },
  { href: "/painel/automacoes", rotulo: "Automações", Icone: Raio },
];

export default function Sidebar() {
  const caminho = usePathname();

  return (
    <aside className="painel-sidebar">
      <div className="painel-marca">
        Painel
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
    </aside>
  );
}

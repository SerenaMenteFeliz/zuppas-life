"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Casa, Estrela, Semana, Sol, Tela } from "./icones";

/* Navegação do app.

   Cinco destinos, todos visíveis, nenhum atrás de menu. A TV não entra na
   barra do celular porque ninguém abre a TV pelo telefone; ela fica no rodapé
   das telas de casa, que é onde alguém vai procurar. */

const DESTINOS = [
  { href: "/", rotulo: "Hoje", Icone: Sol },
  { href: "/semana", rotulo: "Semana", Icone: Semana },
  { href: "/casa", rotulo: "A casa", Icone: Casa },
  { href: "/akiane", rotulo: "Akiane", Icone: Estrela },
  { href: "/tv", rotulo: "TV", Icone: Tela },
];

export default function Nav() {
  const caminho = usePathname();

  /* A TV não tem navegação: nada ali é clicável por decisão de produto, e uma
     barra de menu numa parede é só ruído que ninguém vai tocar. */
  if (caminho.startsWith("/tv")) return null;

  return (
    <nav className="nav-barra">
      {DESTINOS.map(({ href, rotulo, Icone }) => {
        const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-item ${ativo ? "nav-item-ativo" : ""}`}
            aria-current={ativo ? "page" : undefined}
          >
            <Icone className="h-5 w-5" />
            <span>{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}

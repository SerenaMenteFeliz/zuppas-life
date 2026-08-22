"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bussola, Claquete, Funil, Pauta, Raio } from "@/components/icones";

/* Sidebar do painel interno — só pro Yan (ver middleware.ts). Diferente da
   Nav da família (5 destinos fixos, barra embaixo no celular): aqui é
   plataforma que vai crescer, então a lista é um array simples de propósito
   — adicionar a próxima seção é uma linha aqui, não um redesenho. */

/* Ordem por frequência de uso, não por importância: Conteúdo é o que a Ge e a
   Liz abrem todo dia, e Inteligência e Registros são de manutenção. Por isso os
   dois entraram no FIM em 22/08/2026, e não ao lado de Conteúdo. */
const DESTINOS = [
  { href: "/painel/funis", rotulo: "Funis", Icone: Funil },
  { href: "/painel/automacoes", rotulo: "Automações", Icone: Raio },
  { href: "/painel/conteudo", rotulo: "Conteúdo", Icone: Claquete },
  { href: "/painel/inteligencia", rotulo: "Inteligência", Icone: Bussola },
  { href: "/painel/registros", rotulo: "Registros", Icone: Pauta },
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
    </aside>
  );
}

/* Houve aqui um link de saída pro app da família ("‹ Rotina da família"), no
   rodapé da sidebar. Tirado a pedido do Yan em 22/08/2026, no mesmo dia em que
   entrou: o painel está sendo preparado pra Ge e pra Liz, e um atalho pra
   rotina da casa não pertence a essa tela por enquanto.

   O beco sem saída que ele resolvia continua existindo (o layout do painel
   troca a casca inteira, então só a URL leva de volta) — é limite conhecido,
   não esquecimento. Se voltar, volta como saída discreta, não como destino. */

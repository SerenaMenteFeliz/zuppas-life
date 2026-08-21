"use client";

import { useRouter } from "next/navigation";
import { PERFIS } from "@/lib/conteudo-tipos";

/* Filtro de perfil como dropdown, não como fileira de chips (Yan, 21/08/2026).

   Cinco chips lado a lado competiam com as três visões por atenção na mesma
   linha e faziam o topo parecer um painel de controle. Dropdown ocupa uma
   caixa, diz o estado atual sem precisar de destaque de cor, e sobra espaço
   pro botão de criar, que é a ação e não um filtro.

   O valor continua vivendo na URL (`?perfil=`), então compartilhar o link e o
   botão voltar seguem funcionando. A mudança é só de aparência, não de
   comportamento. */
export default function FiltroPerfil({
  valor,
  href,
}: {
  valor?: string;
  href: (perfil?: string) => string;
}) {
  const router = useRouter();

  return (
    <label className="conteudo-filtro">
      <span>Perfil</span>
      <select
        className="conteudo-select"
        value={valor ?? ""}
        onChange={(e) => router.push(href(e.target.value || undefined))}
      >
        <option value="">Todos</option>
        {PERFIS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.dono}
          </option>
        ))}
      </select>
    </label>
  );
}

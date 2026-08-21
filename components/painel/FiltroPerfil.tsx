"use client";

import { useRouter } from "next/navigation";

/* Filtro de perfil como dropdown, não como fileira de chips (Yan, 21/08/2026).

   Cinco chips lado a lado competiam com as três visões por atenção na mesma
   linha e faziam o topo parecer um painel de controle. Dropdown ocupa uma
   caixa, diz o estado atual sem precisar de destaque de cor, e sobra espaço
   pro botão de criar, que é a ação e não um filtro.

   O valor continua vivendo na URL (`?perfil=`), então compartilhar o link e o
   botão voltar seguem funcionando. A mudança é só de aparência, não de
   comportamento.

   As opções chegam com o href já montado, em vez de este componente receber a
   função que monta a URL: função não atravessa a fronteira servidor/cliente, e
   passar uma derruba a página inteira com 500 (foi o que aconteceu no primeiro
   deploy desta tela). Assim a regra de montar URL continua vivendo só na
   página, e o que cruza a fronteira é texto. */
export type OpcaoPerfil = { id: string; rotulo: string; href: string };

export default function FiltroPerfil({
  valor,
  opcoes,
}: {
  valor?: string;
  opcoes: OpcaoPerfil[];
}) {
  const router = useRouter();

  return (
    <label className="conteudo-filtro">
      <span>Perfil</span>
      <select
        className="conteudo-select"
        value={valor ?? ""}
        onChange={(e) => {
          const escolhida = opcoes.find((o) => o.id === e.target.value);
          if (escolhida) router.push(escolhida.href);
        }}
      >
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

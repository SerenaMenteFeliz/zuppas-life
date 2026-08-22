"use client";

import { useRouter } from "next/navigation";
import Dropdown from "@/components/painel/Dropdown";

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
export type OpcaoPerfil = { id: string; rotulo: string; href: string; cor?: string };

export default function FiltroPerfil({
  valor,
  opcoes,
}: {
  valor?: string;
  opcoes: OpcaoPerfil[];
}) {
  const router = useRouter();

  /* Sem o rótulo "Perfil" ao lado (Yan, 22/08/2026): a própria opção já diz
     "Todos os perfis", e o nome de cada perfil também se explica sozinho. O
     rótulo visível só repetia a palavra e engordava a faixa. Continua existindo
     como `aria-label`, porque leitor de tela não enxerga a opção selecionada
     como se fosse o nome do campo.

     Dropdown próprio desde 22/08/2026 (ver Dropdown.tsx). Aqui ele ganha algo
     que o `<select>` não fazia: a bolinha de cor de cada perfil, a MESMA do
     calendário. Filtrar e ler o calendário passam a usar o mesmo código de
     cor, em vez de a cor existir só num dos dois lugares. */
  return (
    <Dropdown
      className="conteudo-filtro"
      rotuloAcessivel="Filtrar por perfil"
      valor={valor ?? ""}
      opcoes={opcoes.map((o) => ({ valor: o.id, rotulo: o.rotulo, cor: o.cor }))}
      aoEscolher={(v) => {
        const escolhida = opcoes.find((o) => o.id === v);
        if (escolhida) router.push(escolhida.href);
      }}
    />
  );
}

"use client";

import { useFormStatus } from "react-dom";

/* Botão de criar post.

   Criar não é navegação: é gravar no banco e só então redirecionar pra tela
   nova. São duas idas ao servidor em sequência, e é o clique mais demorado do
   painel — justamente o que mais precisa dizer que está acontecendo.

   `useFormStatus` exige estar DENTRO do `<form>`, num filho: por isso o botão
   é componente próprio em vez de um `disabled` no JSX da página.

   O rótulo depende do filtro (Yan, 22/08/2026):

   - **com perfil filtrado**, ele diz o destino ("+ Criar para Ge"), porque aí
     a escolha já foi feita ali em cima e o botão só confirma;
   - **com "Todos os perfis"**, ele é só "+ Criar" e não promete nada: o perfil
     se escolhe na tela seguinte, onde o campo é o segundo da primeira linha.

   Prometer um dono que a pessoa não escolheu seria pior que não falar nada. */
export default function BotaoCriar({ dono }: { dono: string | null }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="conteudo-botao" disabled={pending}>
      {pending ? "Criando..." : dono ? "+ Criar para " + dono : "+ Criar"}
    </button>
  );
}

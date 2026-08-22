"use client";

import { useFormStatus } from "react-dom";

/* Botão de criar post.

   Criar não é navegação: é gravar no banco e só então redirecionar pra tela
   nova. São duas idas ao servidor em sequência, e é o clique mais demorado do
   painel — justamente o que mais precisa dizer que está acontecendo.

   `useFormStatus` exige estar DENTRO do `<form>`, num filho: por isso o botão
   é componente próprio em vez de um `disabled` no JSX da página.

   O destino aparece no rótulo (Yan não pediu, mas o padrão silencioso era um
   defeito): sem filtro de perfil, o post nascia da Ge sem nada dizer isso. */
export default function BotaoCriar({ dono }: { dono: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="conteudo-botao" disabled={pending}>
      {pending ? "criando..." : "+ Criar para " + dono}
    </button>
  );
}

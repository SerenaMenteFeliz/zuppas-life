"use client";

import { useFormStatus } from "react-dom";

/* Botão de submit genérico do painel, com estado de envio.

   Usado no formulário de métricas, que é o único do painel que ainda grava por
   `<form action>` em vez de autosave (de propósito: métrica é número colhido de
   uma vez, e autosave gravaria leitura pela metade enquanto os dígitos ainda
   estão sendo digitados). Sendo por botão, o botão precisa dizer que foi. */
export default function BotaoEnviar({
  children,
  enviando,
  className = "conteudo-botao",
}: {
  children: React.ReactNode;
  enviando: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? enviando : children}
    </button>
  );
}

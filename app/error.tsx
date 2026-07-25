"use client";

import { useEffect } from "react";

/* Fronteira de erro.

   O mesmo buraco que a análise técnica de 11/07 achou no serena-app e que a
   segunda passada fechou lá. Hoje quase não custa nada, porque o app lê da
   memória; no dia em que o Supabase entrar, uma falha de rede sem isto é tela
   branca pra família inteira sem explicação nenhuma.

   Em Next 16 o segundo prop se chama `unstable_retry`, não `reset`. */

export default function Erro({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="veil-bg flex min-h-screen items-center justify-center px-6">
      <div className="glass-card glass-card-strong max-w-sm p-7 text-center">
        <h1
          className="mb-2 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Alguma coisa não abriu
        </h1>
        <p className="mb-5 text-sm" style={{ color: "var(--ink-soft)" }}>
          Nada do que você marcou se perdeu. É só tentar de novo.
        </p>
        <button className="botao" onClick={unstable_retry}>
          Tentar de novo
        </button>
      </div>
    </main>
  );
}

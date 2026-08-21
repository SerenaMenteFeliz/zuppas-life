"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/* Avisos do painel (21/08/2026): a resposta visível a uma ação que terminou.

   Antes, apertar um botão aqui não produzia sinal nenhum: a ação ia pro
   servidor, demorava, e a tela ficava parada. Foi a primeira coisa que o Yan
   notou usando ("parece que nem acontece nada").

   Duas regras que valem mais que o componente:

   1. **Aviso é pra ação com começo e fim** (post apagado, métrica registrada,
      falha ao salvar). **Nunca pro autosave**: salvar acontece a cada poucos
      segundos enquanto se digita, e um aviso por vez seria ruído constante. O
      autosave fala pelo indicador de estado que vive ao lado do que ele salva.
   2. **Erro não some sozinho.** Sucesso desaparece em 4s porque a pessoa já
      viu o efeito na tela; erro fica até ser fechado, senão a falha passa
      despercebida, que é a classe de problema que custou 23 leads em 04/08.

   A comunicação é por evento no `window` em vez de contexto do React porque
   quem dispara está espalhado por componentes que não compartilham árvore
   (formulário de dados, roteiro, métricas), e um provider em volta de tudo
   forçaria o layout do painel a virar componente de cliente. */

export type Aviso = { id: number; texto: string; tipo: "ok" | "erro" };

const EVENTO = "zl:aviso";
const GUARDADO = "zl:aviso-pendente";

/** Mostra um aviso na tela atual. */
export function avisar(texto: string, tipo: "ok" | "erro" = "ok") {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { texto, tipo } }));
}

/** Guarda um aviso pra aparecer DEPOIS de uma navegação. Serve pro caso em que
    a ação leva pra outra página (apagar um post joga pra lista): avisar na
    página que está saindo não adianta, ninguém veria. */
export function avisarNaProxima(texto: string, tipo: "ok" | "erro" = "ok") {
  try {
    sessionStorage.setItem(GUARDADO, JSON.stringify({ texto, tipo }));
  } catch {
    /* Aba anônima ou storage bloqueado: perder o aviso é aceitável, quebrar a
       exclusão não é. */
  }
}

export default function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximoId = useRef(1);
  /* Este componente mora no layout do painel, que NÃO remonta quando o app
     navega de uma tela pra outra: sem observar o caminho, o aviso guardado
     antes de um redirect nunca seria lido (achado testando em 21/08/2026, o
     "Post apagado" simplesmente não aparecia). */
  const caminho = usePathname();

  const receber = useCallback((texto: string, tipo: "ok" | "erro") => {
    const id = proximoId.current++;
    setAvisos((atuais) => [...atuais, { id, texto, tipo }]);
    if (tipo === "ok") {
      setTimeout(() => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), 4000);
    }
  }, []);

  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent).detail as { texto: string; tipo: "ok" | "erro" };
      receber(d.texto, d.tipo);
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, [receber]);

  useEffect(() => {
    /* Aviso que atravessou uma navegação. Lido e apagado no mesmo gesto, senão
       reaparece a cada visita à página. */
    try {
      const guardado = sessionStorage.getItem(GUARDADO);
      if (!guardado) return;
      sessionStorage.removeItem(GUARDADO);
      const d = JSON.parse(guardado) as { texto: string; tipo: "ok" | "erro" };
      receber(d.texto, d.tipo);
    } catch {
      /* Aba anônima ou storage bloqueado: perder o aviso é aceitável. */
    }
  }, [caminho, receber]);

  if (avisos.length === 0) return null;

  return (
    /* `aria-live` pra que quem usa leitor de tela receba o aviso sem precisar
       procurar por ele no canto da página. */
    <div className="painel-avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className={"painel-aviso" + (a.tipo === "erro" ? " painel-aviso-erro" : "")}>
          <span>{a.texto}</span>
          <button
            type="button"
            className="painel-aviso-fechar"
            aria-label="fechar aviso"
            onClick={() => setAvisos((atuais) => atuais.filter((x) => x.id !== a.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

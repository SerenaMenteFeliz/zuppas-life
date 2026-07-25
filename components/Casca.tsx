"use client";

import { useEffect } from "react";
import { useZuppas } from "@/lib/store";
import { ESCALA_TEXTO } from "@/lib/types";

/* Casca do app: o que precisa valer em todas as telas.

   Três responsabilidades, todas de efeito colateral no documento, por isso um
   componente só e sem marcação própria:

   1. **Escala de texto.** Multiplica o tamanho base do documento em vez de
      tocar em cada `rem` do CSS. Como todo o app usa unidade relativa, mudar a
      raiz reescala tudo junto, inclusive espaçamento, e nada quebra de layout.
   2. **Modo calmo.** Vira uma classe na raiz, e o CSS decide o que esconder.
      Manter a decisão no CSS evita espalhar `if (modoCalmo)` por dez telas.
   3. **Service worker.** Registrado depois do carregamento pra não competir
      com a primeira pintura. */

export default function Casca({ children }: { children: React.ReactNode }) {
  const { preferencias } = useZuppas();

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.fontSize = `${ESCALA_TEXTO[preferencias.tamanhoTexto] * 100}%`;
    raiz.classList.toggle("modo-calmo", preferencias.modoCalmo);
  }, [preferencias.tamanhoTexto, preferencias.modoCalmo]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    /* Em desenvolvimento o service worker atrapalha mais do que ajuda: segura
       versão velha de página enquanto o HMR tenta trocar o mesmo arquivo. */
    if (process.env.NODE_ENV !== "production") return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Navegador antigo, contexto sem HTTPS, ou usuário com o recurso
           desligado. O app funciona igual, só não instala nem abre offline. */
      });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return <>{children}</>;
}

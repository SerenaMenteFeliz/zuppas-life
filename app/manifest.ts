import type { MetadataRoute } from "next";

/* Manifesto do app instalável.

   Não é enfeite de checklist: **é o pré-requisito da fase 5**. Notificação em
   iPhone só existe pra web app adicionado à tela de início, com permissão
   concedida ali dentro. Sem manifesto válido e service worker registrado, o
   aparelho nem oferece a instalação, e a fase de lembrete não sai do papel.

   Antes disso, instalar já paga sozinho: abre sem barra de navegador, entra na
   gaveta de apps junto dos outros, e é o que faz a Liz tratar isso como um app
   da casa em vez de um site que alguém mandou o link.

   O ícone 512 é declarado como `maskable`: sem isso, o lançador do Android
   recorta o desenho dentro de um círculo branco e sobra uma bolinha com borda.
   O conteúdo do ícone fica nos 80% centrais, que é a área segura do recorte. */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zuppas Life",
    short_name: "Zuppas",
    description: "O dia da casa, num lugar só.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    lang: "pt-BR",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Hoje", url: "/" },
      { name: "A semana", url: "/semana" },
      { name: "A casa", url: "/casa" },
    ],
  };
}

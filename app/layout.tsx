import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Casca from "@/components/Casca";
import Desfazer from "@/components/Desfazer";
import Nav from "@/components/Nav";
import "./globals.css";

/* Fraunces + Manrope é o par tipográfico do guarda-chuva (tema `hub` do
   serena-app). Um painel da família não é um produto específico, então herda
   a tipografia da marca-mãe em vez de ganhar a de um dos produtos. */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-app-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zuppas Life",
  description: "O dia da casa, num lugar só.",
  applicationName: "Zuppas Life",
  appleWebApp: {
    capable: true,
    title: "Zuppas",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  /* Duas cores porque a TV vira véu escuro depois das 18h e a barra do
     navegador tem que acompanhar, senão fica uma faixa clara no escuro. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1a201a" },
  ],
  /* Sem zoom travado: a Liz e a Ge usam o app de manhã, e alguém vai querer
     aumentar a fonte. Travar zoom por estética é acessibilidade jogada fora. */
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${manrope.variable} theme-casa h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Atalho de teclado pra pular direto ao conteúdo. Invisível até
            receber foco, que é o padrão de quem navega sem mouse. */}
        <a href="#conteudo" className="pular-para-conteudo">
          Pular para o conteúdo
        </a>

        <Casca>
          <div id="conteudo">{children}</div>
          <Desfazer />
          <Nav />
        </Casca>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
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
};

export const viewport: Viewport = {
  themeColor: "#f7f4ee",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}

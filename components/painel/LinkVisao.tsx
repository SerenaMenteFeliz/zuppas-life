"use client";

import Link, { useLinkStatus } from "next/link";

/* Botão de visão (Quadro / Calendário / Lista) que acende no clique.

   O esqueleto do `loading.tsx` cobre a área de conteúdo, mas demora um
   instante pra aparecer e não diz QUAL botão foi clicado. Como as três visões
   ficam coladas num controle só, sem isso a pessoa clica em "Calendário", nada
   muda por 200ms e ela clica de novo — e o segundo clique é o que faz a tela
   parecer travada, não o primeiro.

   `useLinkStatus` só funciona dentro de um `<Link>`, por isso o indicador é um
   componente filho e não um atributo daqui. */
function Pontinho() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="pn-carregando-ponto" />;
}

export default function LinkVisao({
  href,
  ativo,
  children,
  className,
}: {
  href: string;
  ativo?: boolean;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link href={href} aria-current={ativo ? "page" : undefined} className={className}>
      {children}
      <Pontinho />
    </Link>
  );
}

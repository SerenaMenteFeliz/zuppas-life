"use client";

import { useState } from "react";
import type { EmailBiblioteca } from "@/lib/biblioteca-email";

/* Prévia dos e-mails transacionais da Biblioteca Oculta (28/08/2026).

   O pedido do Yan foi "o e-mail visível". Visível de verdade quer dizer
   renderizado, não descrito: descrição em prosa de um layout é exatamente o
   que não deixa ninguém perceber que um botão sumiu ou que o rodapé quebrou.

   POR QUE IFRAME E NÃO dangerouslySetInnerHTML: o HTML do e-mail traz `body`
   com fundo próprio, margem e família de fonte. Injetado direto na página, ou
   ele vaza pro painel ou o painel esmaga ele, e nos dois casos a prévia deixa
   de ser fiel, que é a única coisa que ela precisa ser. O iframe dá ao e-mail
   o documento inteiro dele, igual ao que o cliente de e-mail dá.

   `sandbox` vazio de propósito: sem scripts, sem formulários, sem navegação.
   O molde não tem nada disso, e a prévia não deveria ganhar poder nenhum por
   acidente se um dia tiver.

   A largura de celular é o padrão, não o desktop. Este produto vende por link
   em bio, e a entrega é lida no telefone. */

const LARGURAS = [
  { id: "celular", rotulo: "Celular", px: 380 },
  { id: "desktop", rotulo: "Desktop", px: 640 },
] as const;

export default function PreviaEmail({
  emails,
  espelhadoEm,
}: {
  emails: EmailBiblioteca[];
  espelhadoEm: string;
}) {
  const [ativo, setAtivo] = useState(emails[0]?.id ?? "");
  const [largura, setLargura] = useState<(typeof LARGURAS)[number]["id"]>("celular");

  const email = emails.find((e) => e.id === ativo) ?? emails[0];
  const px = LARGURAS.find((l) => l.id === largura)?.px ?? 380;

  if (!email) return null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Barra de escolha: qual e-mail, e em que largura */}
      <div
        className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--linha, rgba(255,255,255,.08))" }}
      >
        <div className="flex flex-wrap gap-1.5">
          {emails.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setAtivo(e.id)}
              className="rounded-full px-3 py-1.5 text-[0.72rem] font-medium transition-colors"
              style={
                e.id === email.id
                  ? { background: "#4b2e83", color: "#fff" }
                  : { background: "rgba(120,110,160,.13)", color: "var(--ink-soft)" }
              }
            >
              {e.nome}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1.5">
          {LARGURAS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLargura(l.id)}
              className="rounded-full px-3 py-1.5 text-[0.68rem] transition-colors"
              style={
                l.id === largura
                  ? { background: "rgba(120,110,160,.22)", color: "var(--ink)" }
                  : { color: "var(--ink-soft)" }
              }
            >
              {l.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Cabeçalho de cliente de e-mail: é o que a pessoa vê ANTES de abrir,
          e assunto e remetente decidem se ela abre. Mostrar só o corpo
          esconderia metade do que precisa de revisão. */}
      <div className="px-4 py-3 text-[0.72rem]" style={{ color: "var(--ink-soft)" }}>
        <p>
          <span style={{ opacity: 0.65 }}>De: </span>
          {email.remetente}
        </p>
        <p className="mt-0.5">
          <span style={{ opacity: 0.65 }}>Assunto: </span>
          <b style={{ color: "var(--ink)" }}>{email.assunto}</b>
        </p>
      </div>

      {/* O e-mail de verdade */}
      <div className="flex justify-center px-4 pb-4">
        <iframe
          key={email.id + largura}
          title={`Prévia do e-mail: ${email.nome}`}
          srcDoc={email.html}
          sandbox=""
          className="rounded-lg border-0"
          style={{ width: px, maxWidth: "100%", height: 460, background: "#f5f3f7" }}
        />
      </div>

      <p
        className="border-t px-4 py-2.5 text-[0.66rem]"
        style={{ borderColor: "var(--linha, rgba(255,255,255,.08))", color: "var(--ink-soft)" }}
      >
        Cópia fiel do molde de <code>biblioteca-oculta/api/_email.js</code>, espelhada à mão em{" "}
        {espelhadoEm}. Nome e link são de exemplo. Se o e-mail mudar lá, esta prévia só acompanha
        quando alguém atualizar <code>lib/biblioteca-email.ts</code>.
      </p>
    </div>
  );
}

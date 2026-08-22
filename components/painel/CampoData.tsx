"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { estiloDoPopover, usePopover } from "@/components/painel/usePopover";
import {
  DIAS_DA_SEMANA,
  deslocarMes,
  gradeDoMes,
  rotuloDoMes,
} from "@/lib/conteudo-calendario";
import { hojeISO, somarDias } from "@/lib/datas";

/* Campo de data com calendário próprio, no lugar de `<input type="date">`.

   Mesma razão do Dropdown.tsx: a caixa fechada até dá pra estilizar, mas o
   calendário que abre é desenhado pelo sistema operacional e chega com fonte,
   cores e cantos de outro app no meio da tela (Yan, 22/08/2026). Some ainda o
   detalhe de o nativo mostrar `yyyy-mm-dd` como placeholder, que não é como
   ninguém escreve data em português.

   O que o próprio ganha além da aparência:
   - **atalhos de verdade** ("hoje", "amanhã", "próxima semana"), que é como as
     datas de conteúdo são de fato escolhidas;
   - **"limpar"**, que no nativo exige selecionar o campo e apagar;
   - dia de hoje marcado, e o dia escolhido preenchido.

   ── Formato ──

   O valor trafega SEMPRE em ISO (`AAAA-MM-DD`), que é o que o banco guarda; só
   a exibição é `DD/MM/AAAA`. Converter na borda e nunca no meio é o que evita a
   classe de bug de data trocada. Nenhuma conta usa `new Date()` sobre o valor,
   pra não passar por fuso: os helpers de `lib/datas` trabalham na string.

   ── Dentro de formulário ──

   Com `name`, renderiza um `<input type="hidden">` junto, pra continuar
   funcionando dentro do `<form action={...}>` das métricas, que é enviado pelo
   servidor e não por estado de cliente. */

/* Versão pra dentro de `<form action={...}>`: guarda o próprio estado e entrega
   o valor pelo `<input type="hidden">`. A página das métricas é componente de
   servidor e envia o formulário pelo servidor, então não tem onde segurar
   estado — e passar um `onChange` de lá pra cá cruzaria a fronteira
   servidor/cliente com uma função, que derruba a rota inteira com 500. */
export function CampoDataFormulario({
  name,
  inicial,
  rotuloAcessivel,
}: {
  name: string;
  inicial: string;
  rotuloAcessivel: string;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoData name={name} valor={valor} aoMudar={setValor} rotuloAcessivel={rotuloAcessivel} />
  );
}

function paraExibir(iso: string): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

export default function CampoData({
  valor,
  aoMudar,
  name,
  rotuloAcessivel,
  vazio = "Escolher data",
}: {
  valor: string;
  aoMudar: (iso: string) => void;
  name?: string;
  rotuloAcessivel: string;
  vazio?: string;
}) {
  const hoje = hojeISO();
  const [aberto, setAberto] = useState(false);
  /* Mês à vista. Abre no mês da data escolhida, ou no de hoje quando vazio. */
  const [mes, setMes] = useState(() => (valor || hoje).slice(0, 7));
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  /* O painel vai por portal pra `document.body`, então precisa de ref próprio:
     o listener de "clicou fora" tem que reconhecer os dois. */
  const painel = useRef<HTMLDivElement>(null);
  /* Mesmo motivo do Dropdown: dentro de um container que rola, o calendário
     era cortado. Ver usePopover.ts. */
  const pos = usePopover(botao, aberto, 258);

  const abrir = useCallback(() => {
    setMes((valor || hoje).slice(0, 7));
    setAberto(true);
  }, [valor, hoje]);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!caixa.current?.contains(alvo) && !painel.current?.contains(alvo)) {
        setAberto(false);
      }
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  function escolher(iso: string) {
    aoMudar(iso);
    fechar();
  }

  const celulas = gradeDoMes(mes).flat();

  return (
    <div ref={caixa} className="pn-data">
      {name && <input type="hidden" name={name} value={valor} />}

      <button
        ref={botao}
        type="button"
        className={"pn-drop-botao" + (valor ? "" : " pn-drop-botao-vazio")}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={rotuloAcessivel + (valor ? ": " + paraExibir(valor) : "")}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={(e) => {
          if (e.key === "Escape" && aberto) {
            e.preventDefault();
            fechar();
          }
          if ((e.key === "ArrowDown" || e.key === "Enter") && !aberto) {
            e.preventDefault();
            abrir();
          }
        }}
      >
        <span className="pn-drop-texto">{valor ? paraExibir(valor) : vazio}</span>
        <svg
          aria-hidden
          className="pn-data-icone"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {aberto &&
        pos &&
        createPortal(
        <div
          ref={painel}
          className="pn-data-painel"
          role="dialog"
          aria-label={rotuloAcessivel}
          style={estiloDoPopover(pos)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              fechar();
            }
          }}
        >
          <div className="pn-data-topo">
            <button
              type="button"
              className="conteudo-mini"
              aria-label="Mês anterior"
              onClick={() => setMes(deslocarMes(mes, -1))}
            >
              ‹
            </button>
            <span className="pn-data-mes">{rotuloDoMes(mes)}</span>
            <button
              type="button"
              className="conteudo-mini"
              aria-label="Próximo mês"
              onClick={() => setMes(deslocarMes(mes, 1))}
            >
              ›
            </button>
          </div>

          <div className="pn-data-grade">
            {DIAS_DA_SEMANA.map((d) => (
              <span key={d} className="pn-data-cabecalho">
                {d.slice(0, 1)}
              </span>
            ))}

            {celulas.map((c) => {
              const dia = Number(c.iso.slice(8, 10));
              return (
                <button
                  key={c.iso}
                  type="button"
                  className={
                    "pn-data-dia" +
                    (c.doMes ? "" : " pn-data-dia-fora") +
                    (c.iso === hoje ? " pn-data-dia-hoje" : "") +
                    (c.iso === valor ? " pn-data-dia-escolhido" : "")
                  }
                  aria-current={c.iso === hoje ? "date" : undefined}
                  aria-pressed={c.iso === valor}
                  onClick={() => escolher(c.iso)}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          {/* Atalhos porque é assim que data de conteúdo é escolhida: quase
              nunca "17 de setembro", quase sempre "amanhã" ou "semana que
              vem". Escolher pelo atalho fecha o painel, igual escolher no
              calendário — o gesto terminou dos dois jeitos. */}
          <div className="pn-data-atalhos">
            <button type="button" className="pn-data-atalho" onClick={() => escolher(hoje)}>
              Hoje
            </button>
            <button
              type="button"
              className="pn-data-atalho"
              onClick={() => escolher(somarDias(hoje, 1))}
            >
              Amanhã
            </button>
            <button
              type="button"
              className="pn-data-atalho"
              onClick={() => escolher(somarDias(hoje, 7))}
            >
              Em 7 dias
            </button>
            {valor && (
              <button
                type="button"
                className="pn-data-atalho pn-data-atalho-limpar"
                onClick={() => escolher("")}
              >
                Limpar
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

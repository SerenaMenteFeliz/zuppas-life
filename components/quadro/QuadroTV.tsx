"use client";

import { useEffect, useState } from "react";
import Grade from "./Grade";
import Palco from "./Palco";
import { diasDaSemana, horaDoDia, horaISO, porExtenso } from "@/lib/datas";
import { useHoje } from "@/lib/store";
import { useQuadro } from "@/lib/useQuadro";

/* O Quadro como a TV mostra: a semana inteira numa tela, nada clicável.

   Mesma regra da TV antiga: TV mostra, desktop resolve. Relê o banco a cada
   30 segundos, então o que alguém marca no PC aparece na sala em menos de meio
   minuto sem ninguém encostar na TV. */

const RELEITURA_SEGUNDOS = 30;
/** Recarga de madrugada: navegador aberto 24h vaza memória até engasgar. */
const HORAS_ATE_RECARREGAR = 6;

function intervalo(dias: string[]): string {
  const [ini, fim] = [porExtenso(dias[0]), porExtenso(dias[6])];
  const semDia = (s: string) => s.slice(s.indexOf(",") + 2);
  const [a, b] = [semDia(ini), semDia(fim)];
  /* "5 a 11 de outubro", ou "28 de setembro a 4 de outubro" na virada. */
  const mesA = a.slice(a.indexOf(" de ") + 4);
  const mesB = b.slice(b.indexOf(" de ") + 4);
  return mesA === mesB ? `${a.slice(0, a.indexOf(" de "))} a ${b}` : `${a} a ${b}`;
}

export default function QuadroTV() {
  const hoje = useHoje();
  const dias = diasDaSemana(hoje);
  const { marcacoes, carregado, erro } = useQuadro(dias[0], dias[6], RELEITURA_SEGUNDOS);
  const [relogio, setRelogio] = useState(horaISO);

  useEffect(() => {
    const tique = setInterval(() => setRelogio(horaISO()), 15_000);
    const recarga = setTimeout(() => window.location.reload(), HORAS_ATE_RECARREGAR * 3_600_000);
    return () => {
      clearInterval(tique);
      clearTimeout(recarga);
    };
  }, []);

  /* Véu escuro depois do pôr do sol, igual à TV antiga. */
  const noite = horaDoDia() >= 18 || horaDoDia() < 6;
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("theme-casa-noite", noite);
    raiz.classList.toggle("theme-casa", !noite);
    return () => {
      raiz.classList.remove("theme-casa-noite");
      raiz.classList.add("theme-casa");
    };
  }, [noite]);

  return (
    <Palco>
      <div className="quadro-tv tv-bg">
        <header className="quadro-tv-topo">
          <div>
            <h1 className="quadro-tv-titulo">Semana da casa</h1>
            <p className="quadro-tv-sub">{intervalo(dias)}</p>
          </div>
          <div className="quadro-tv-hora">
            <div className="quadro-tv-relogio">{relogio}</div>
            <p className="quadro-tv-sub">{porExtenso(hoje)}</p>
          </div>
        </header>

        <div className="quadro-tv-corpo">
          {carregado && <Grade dias={dias} hoje={hoje} marcacoes={marcacoes} />}
        </div>

        <footer className="quadro-tv-rodape">
          <span className="quadro-legenda">
            <span className="quadro-inicial" style={{ background: "var(--accent)" }}>
              L
            </span>
            feito, com a inicial de quem fez
          </span>
          <span className="quadro-legenda">
            <span className="quadro-legenda-faltou" />
            passou e não foi feito
          </span>
          <span className="quadro-legenda">
            <span className="quadro-vazio" />
            em aberto
          </span>
          {erro && <span className="quadro-tv-erro">{erro}</span>}
        </footer>
      </div>
    </Palco>
  );
}

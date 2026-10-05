"use client";

import { useEffect, useMemo, useState } from "react";
import Marcas from "./Marcas";
import Palco from "./Palco";
import {
  diasDaSemana,
  horaDoDia,
  horaISO,
  nomeDoDiaCurto,
  porExtenso,
  somarDias,
} from "@/lib/datas";
import {
  INICIO_QUADRO,
  chaveMarca,
  diaDoQuadro,
  indexarMarcacoes,
  minutos,
  type Agendado,
} from "@/lib/quadro-itens";
import { useHoje } from "@/lib/store";
import { useQuadro } from "@/lib/useQuadro";
import {
  FAIXAS,
  FAIXA_LABEL,
  blocoDaHora,
  faixaDe,
  type Faixa,
  type Ocorrencia,
  type Pessoa,
} from "@/lib/types";

/* O Quadro como a TV mostra. Três blocos, nada clicável (TV mostra, desktop
   resolve):

   - Esquerda, altura toda: HOJE, por período, com os itens de horário na
     ordem do relógio e uma linha "agora" cortando a lista na hora certa. É a
     noção de horário: o que passou fica acima da linha, o que vem fica abaixo.
   - Direita em cima: AGORA, o próximo item com horário e quanto falta.
   - Direita embaixo: a SEMANA. A rotina se repete igual todo dia, então
     listá-la sete vezes não informa nada; cada período de cada dia vira uma
     barra de quanto foi feito, e só o agendado aparece por escrito.

   Relê o banco a cada 30 segundos: o que alguém marca no PC aparece na sala
   em menos de meio minuto. */

const RELEITURA_SEGUNDOS = 30;
/** Recarga de madrugada: navegador aberto 24h vaza memória até engasgar. */
const HORAS_ATE_RECARREGAR = 6;

type Quem = Map<string, Pessoa[]>;

function feito(o: Ocorrencia, quem: Quem) {
  return (quem.get(chaveMarca(o.id, o.data))?.length ?? 0) > 0;
}

function intervalo(dias: string[]): string {
  const semDia = (s: string) => s.slice(s.indexOf(",") + 2);
  const [a, b] = [semDia(porExtenso(dias[0])), semDia(porExtenso(dias[6]))];
  const mes = (s: string) => s.slice(s.indexOf(" de ") + 4);
  return mes(a) === mes(b) ? `${a.slice(0, a.indexOf(" de "))} a ${b}` : `${a} a ${b}`;
}

export default function QuadroTV() {
  const hoje = useHoje();
  /* A semana carregada inclui a segunda seguinte, pra que o "Agora" de domingo
     à noite saiba o que tem amanhã cedo. */
  const dias = diasDaSemana(hoje);
  const { marcacoes, agenda, carregado, erro } = useQuadro(
    dias[0],
    somarDias(dias[6], 1),
    RELEITURA_SEGUNDOS
  );
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

  const quem = useMemo(() => indexarMarcacoes(marcacoes), [marcacoes]);
  const doDia = useMemo(() => diaDoQuadro(hoje, agenda), [hoje, agenda]);
  const amanha = useMemo(() => diaDoQuadro(somarDias(hoje, 1), agenda), [hoje, agenda]);

  return (
    <Palco>
      <div className="quadro-tv tv-bg">
        <section className="qt-hoje glass-card">
          <Hoje hoje={hoje} relogio={relogio} ocorrencias={doDia} quem={quem} />
        </section>
        <section className="qt-agora glass-card">
          <Agora
            relogio={relogio}
            hojeISO={hoje}
            hoje={doDia}
            amanha={amanha}
            agenda={agenda}
            quem={quem}
          />
        </section>
        <section className="qt-semana glass-card">
          <Semana dias={dias} hoje={hoje} agenda={agenda} quem={quem} intervalo={intervalo(dias)} />
        </section>
        {(erro || !carregado) && (
          <p className="qt-aviso">{erro ?? "Carregando o quadro…"}</p>
        )}
      </div>
    </Palco>
  );
}

/* ── Hoje ─────────────────────────────────────────────────────────────────── */

function Hoje({
  hoje,
  relogio,
  ocorrencias,
  quem,
}: {
  hoje: string;
  relogio: string;
  ocorrencias: Ocorrencia[];
  quem: Quem;
}) {
  const agora = minutos(relogio);
  const blocoAtual = blocoDaHora(Number(relogio.slice(0, 2)));

  return (
    <div className="qt-hoje-dentro">
      <header className="qt-hoje-topo">
        <div className="qt-relogio">{relogio}</div>
        <div className="qt-data">{porExtenso(hoje)}</div>
      </header>

      <div className="qt-periodos">
        {FAIXAS.map((faixa) => {
          const lista = ocorrencias.filter((o) => faixaDe(o) === faixa);
          if (lista.length === 0) return null;
          const comHora = lista.filter((o) => o.horario);
          const semHora = lista.filter((o) => !o.horario);
          const atual = faixa === blocoAtual;
          const prontos = lista.filter((o) => feito(o, quem)).length;
          /* A linha "agora" entra antes do primeiro item com hora ainda por
             vir. Se todos já passaram, ela fecha a lista de horários. */
          const corte = atual ? comHora.findIndex((o) => minutos(o.horario!) > agora) : -2;

          return (
            <div key={faixa} className={`qt-periodo ${atual ? "qt-periodo-atual" : ""}`}>
              <div className="qt-periodo-topo">
                <span className="qt-periodo-nome">{FAIXA_LABEL[faixa as Faixa]}</span>
                {atual && <span className="qt-periodo-agora">agora</span>}
                <span className="qt-periodo-conta">
                  {prontos} de {lista.length}
                </span>
              </div>

              {comHora.map((o, i) => (
                <div key={o.chave}>
                  {i === corte && <LinhaAgora relogio={relogio} />}
                  <div
                    className={`qt-item ${feito(o, quem) ? "qt-feito" : ""} ${o.removivel ? "qt-agendado" : ""}`}
                  >
                    <span className="qt-hora">{o.horario}</span>
                    <span className="qt-titulo">{o.titulo}</span>
                    <Marcas pessoas={quem.get(o.chave) ?? []} />
                  </div>
                </div>
              ))}
              {atual && comHora.length > 0 && corte === -1 && <LinhaAgora relogio={relogio} />}

              {semHora.length > 0 && (
                <div className="qt-soltos">
                  {semHora.map((o) => (
                    <span
                      key={o.chave}
                      className={`qt-solto ${feito(o, quem) ? "qt-feito" : ""} ${o.removivel ? "qt-agendado" : ""}`}
                    >
                      <Marcas pessoas={quem.get(o.chave) ?? []} />
                      {o.titulo}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinhaAgora({ relogio }: { relogio: string }) {
  return (
    <div className="qt-linha-agora" aria-label={`agora, ${relogio}`}>
      <span>{relogio}</span>
    </div>
  );
}

/* ── Agora ────────────────────────────────────────────────────────────────── */

function falta(min: number): string {
  if (min <= 0) return min > -10 ? "agora" : `começou há ${-min} min`;
  if (min < 60) return `daqui a ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `daqui a ${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

function Agora({
  relogio,
  hojeISO,
  hoje,
  amanha,
  agenda,
  quem,
}: {
  relogio: string;
  hojeISO: string;
  hoje: Ocorrencia[];
  amanha: Ocorrencia[];
  agenda: Agendado[];
  quem: Quem;
}) {
  const agora = minutos(relogio);
  /* O que ainda vem hoje com horário e ninguém marcou. Item que começou há
     menos de 10 minutos ainda conta: buscar a criança às 11:50 não deixa de
     ser o assunto às 11:52. */
  const proximos = hoje
    .filter((o) => o.horario && minutos(o.horario) > agora - 10 && !feito(o, quem))
    .sort((a, b) => a.horario!.localeCompare(b.horario!));
  /* Sem repetir o que já está em destaque logo acima. */
  const emDestaque = new Set(proximos.slice(0, 3).map((o) => o.id));
  const daquiPraFrente = agenda
    .filter((a) => a.data >= hojeISO && !emDestaque.has(a.id))
    .filter((a) => !(a.data === hojeISO && a.horario && minutos(a.horario) < agora - 10))
    .sort((a, b) => (a.data + (a.horario ?? "")).localeCompare(b.data + (b.horario ?? "")));
  const primeiroAmanha = amanha
    .filter((o) => o.horario)
    .sort((a, b) => a.horario!.localeCompare(b.horario!))[0];

  return (
    <div className="qt-agora-dentro">
      <h2 className="qt-rotulo">Agora</h2>
      {proximos.length > 0 ? (
        <>
          <div className={`qt-proximo ${proximos[0].removivel ? "qt-agendado" : ""}`}>
            <div className="qt-proximo-falta">{falta(minutos(proximos[0].horario!) - agora)}</div>
            <div className="qt-proximo-titulo">
              <span className="qt-hora">{proximos[0].horario}</span> {proximos[0].titulo}
            </div>
          </div>
          {proximos.slice(1, 3).map((o) => (
            <div key={o.chave} className={`qt-depois ${o.removivel ? "qt-agendado" : ""}`}>
              <span className="qt-hora">{o.horario}</span> {o.titulo}
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="qt-proximo">
            <div className="qt-proximo-falta">Nada mais com horário hoje</div>
          </div>
          {primeiroAmanha && (
            <div className="qt-depois">
              Amanhã <span className="qt-hora">{primeiroAmanha.horario}</span>{" "}
              {primeiroAmanha.titulo}
            </div>
          )}
        </>
      )}

      {/* Os agendados da semana por extenso. Na grade da semana a coluna de
          cada dia é estreita demais pro título (só o horário cabe), então é
          aqui que eles são lidos. */}
      {daquiPraFrente.length > 0 && (
        <div className="qt-agenda">
          <h3 className="qt-rotulo">Agendado</h3>
          {daquiPraFrente.slice(0, 4).map((a) => (
            <div key={a.id} className="qt-agenda-item">
              <span className="qt-agenda-dia">
                {a.data === hojeISO ? "hoje" : nomeDoDiaCurto(a.data)}
              </span>
              <span className="qt-hora">{a.horario ?? FAIXA_LABEL[a.bloco].toLowerCase()}</span>
              <span className="qt-titulo">{a.titulo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Semana ───────────────────────────────────────────────────────────────── */

function Semana({
  dias,
  hoje,
  agenda,
  quem,
  intervalo,
}: {
  dias: string[];
  hoje: string;
  agenda: Agendado[];
  quem: Quem;
  intervalo: string;
}) {
  const porDia = useMemo(
    () => new Map(dias.map((d) => [d, diaDoQuadro(d, agenda)])),
    [dias, agenda]
  );

  return (
    <div className="qt-semana-dentro">
      <h2 className="qt-rotulo">
        Semana <span className="qt-rotulo-fino">{intervalo}</span>
      </h2>
      <div className="qt-semana-grade">
        <span />
        {dias.map((d) => (
          <span key={d} className={`qt-semana-dia ${d === hoje ? "qt-semana-hoje" : ""}`}>
            {d === hoje ? "hoje" : nomeDoDiaCurto(d)} <b>{Number(d.slice(8, 10))}</b>
          </span>
        ))}

        {FAIXAS.map((faixa) => (
          <Linha key={faixa} faixa={faixa} dias={dias} hoje={hoje} porDia={porDia} quem={quem} />
        ))}
      </div>
    </div>
  );
}

function Linha({
  faixa,
  dias,
  hoje,
  porDia,
  quem,
}: {
  faixa: Faixa;
  dias: string[];
  hoje: string;
  porDia: Map<string, Ocorrencia[]>;
  quem: Quem;
}) {
  return (
    <>
      <span className="qt-semana-faixa">{FAIXA_LABEL[faixa]}</span>
      {dias.map((d) => {
        const lista = (porDia.get(d) ?? []).filter((o) => faixaDe(o) === faixa);
        const rotina = lista.filter((o) => !o.removivel);
        const agendados = lista.filter((o) => o.removivel);
        const prontos = rotina.filter((o) => feito(o, quem)).length;
        const parte = rotina.length ? prontos / rotina.length : 0;
        const faltou = d >= INICIO_QUADRO && d < hoje && rotina.length > 0 && prontos < rotina.length;
        return (
          <div
            key={d}
            className={`qt-semana-celula ${d === hoje ? "qt-semana-celula-hoje" : ""} ${faltou ? "qt-semana-faltou" : ""}`}
          >
            {rotina.length > 0 && (
              <span className="qt-barra" aria-label={`${prontos} de ${rotina.length}`}>
                <span style={{ width: `${Math.round(parte * 100)}%` }} />
              </span>
            )}
            {agendados.map((o) => (
              <span key={o.chave} className="qt-semana-agendado" title={o.titulo}>
                {o.horario ?? "•"}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
}

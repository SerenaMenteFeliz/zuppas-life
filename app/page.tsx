"use client";

import { useMemo, useState } from "react";
import Agendar from "@/components/Agendar";
import Ajustes from "@/components/Ajustes";
import Linha from "@/components/Linha";
import Pendencias from "@/components/Pendencias";
import Popup from "@/components/Popup";
import Placar from "@/components/Placar";
import { Rotulo, Vazio } from "@/components/ui";
import { Anel, CabecalhoFaixa } from "@/components/visual";
import { Filtro } from "@/components/icones";
import {
  corrente,
  ehComigo,
  emAberto,
  estadoDa,
  indexar,
  ocorrenciasDoDia,
  quemFez,
  quemPegou,
  type Marcas,
} from "@/lib/agenda";
import { horaDoDia, porExtenso } from "@/lib/datas";
import {
  alternarConclusao,
  definirPessoa,
  desagendar,
  pegar,
  pular,
  useHoje,
  useZuppas,
} from "@/lib/store";
import {
  FAIXAS,
  PESSOAS,
  blocoDaHora,
  faixaDe,
  type Faixa,
  type Ocorrencia,
} from "@/lib/types";

/* "Hoje, e é meu" — a superfície pessoal.

   Reorganizada em 24/07 depois do feedback do Yan. O que mudou e por quê:

   - **O dia é uma faixa por bloco, não uma aba escrita.** Manhã, tarde e noite
     ganharam cor, ícone e progresso próprios, e aparecem os três de uma vez.
     Filtrar por bloco continua existindo, mas virou o segundo toque: a primeira
     pergunta de quem abre é o dia inteiro.
   - **As fileiras de botão viraram dois popups.** Quem sou eu e o que estou
     vendo. Antes eram quinze pílulas empilhadas antes de qualquer conteúdo.
   - **Anel de progresso no topo.** Um número seco não diz se o dia está indo
     bem; o anel diz antes de alguém ler o número.
   - **Pendências agrupadas por projeto e recolhíveis**, porque 22 numa coluna
     única viram uma parede de texto que o olho pula.

   Revisão de 25/07, depois de a casa virar mural:

   - **O padrão passou a ser "a casa toda".** Com quase nada tendo dono, "só o
     que é meu" mostraria três linhas e esconderia justamente o dia da casa, que
     é o que o painel existe pra tornar visível. O filtro continua ali, e agora
     quer dizer "meu, mais o que eu peguei ou fiz".
   - **Uma faixa a mais: a qualquer hora.** Pro que precisa acontecer no dia e
     não precisa acontecer numa hora, como a meditação.
   - **Faixa vazia some.** Quatro cabeçalhos fixos com "nada aqui" embaixo
     empurravam o conteúdo real pra fora da primeira tela do celular.
   - **Placar da semana na coluna de contexto.** É a contrapartida de ter tirado
     os nomes das tarefas: sem ver quem fez, o mural vira terra de ninguém. */

export default function Hoje() {
  const estado = useZuppas();
  const hoje = useHoje();

  const [faixa, setFaixa] = useState<Faixa | "tudo">("tudo");
  /* Padrão virou a casa toda em 25/07. Com quase tudo no mural, "só o que é
     meu" mostraria três linhas e esconderia o dia da casa, que é justamente o
     que o painel existe pra tornar visível. */
  const [soMeu, setSoMeu] = useState(false);

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const ocorrencias = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  const doEscopo = useMemo(
    () =>
      soMeu
        ? ocorrencias.filter((o) => ehComigo(o, estado.eu, marcas))
        : ocorrencias,
    [ocorrencias, soMeu, estado.eu, marcas]
  );

  const visiveis =
    faixa === "tudo" ? doEscopo : doEscopo.filter((o) => faixaDe(o) === faixa);

  const feitasNoEscopo = doEscopo.filter((o) => marcas.feitas.has(o.chave)).length;
  const abertasNoEscopo = doEscopo.filter((o) =>
    emAberto(estadoDa(o.chave, marcas))
  ).length;

  const ancoras = ocorrencias.filter((o) => o.ancora);
  const ancorasFeitas = ancoras.filter((o) => marcas.feitas.has(o.chave)).length;
  const dias = useMemo(
    () => corrente(hoje, estado.itens, marcas.feitas, estado.preferencias.folgaSemanal),
    [hoje, estado.itens, marcas.feitas, estado.preferencias.folgaSemanal]
  );

  const faixaAgora: Faixa = blocoDaHora(horaDoDia());
  const minhasPendencias = estado.pendencias.filter(
    (p) => p.status !== "concluida" && (!soMeu || p.responsavel === estado.eu)
  );
  const bloqueio = estado.pendencias.find(
    (p) => p.bloqueio && p.status !== "concluida"
  );

  const saudacao =
    horaDoDia() < 12 ? "Bom dia" : horaDoDia() < 18 ? "Boa tarde" : "Boa noite";

  function acoes(o: Ocorrencia) {
    return {
      estado: estadoDa(o.chave, marcas),
      fez: quemFez(o.chave, marcas),
      pegou: quemPegou(o.chave, marcas),
      eu: estado.eu,
      aoMarcar: () => alternarConclusao(o.id, hoje, estado.eu),
      aoPegar: () => pegar(o.id, hoje, estado.eu),
      aoPular: () => pular(o.id, hoje, estado.eu),
      aoRemover: o.removivel ? () => desagendar(o.id) : undefined,
    };
  }

  return (
    <main className="veil-bg pb-32">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1400px] lg:px-10 lg:pt-12">
        {/* Cabeçalho */}
        <header className="mb-6 flex items-start gap-4 lg:mb-9">
          <div className="min-w-0 flex-1">
            <p className="tv-rotulo mb-1.5">{porExtenso(hoje)}</p>
            <h1
              className="text-3xl lg:text-5xl"
              style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
            >
              {saudacao}, {estado.eu}.
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              {abertasNoEscopo === 0
                ? "Nada em aberto agora."
                : `${abertasNoEscopo} em aberto`}
              {dias > 0 && ` · ${dias} ${dias === 1 ? "dia seguido" : "dias seguidos"}`}
            </p>
          </div>

          <Anel feitas={feitasNoEscopo} total={doEscopo.length} tamanho={68} />
        </header>

        {/* Controles: dois popups, e o filtro de bloco como atalho */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Popup rotulo="Quem sou eu" valor={estado.eu}>
            {(fechar) => (
              <div className="flex w-44 flex-col gap-1">
                {PESSOAS.map((p) => (
                  <ItemPopup
                    key={p}
                    ativo={p === estado.eu}
                    aoEscolher={() => {
                      definirPessoa(p);
                      fechar();
                    }}
                  >
                    {p}
                  </ItemPopup>
                ))}
              </div>
            )}
          </Popup>

          <Popup
            rotulo="O que ver"
            valor={soMeu ? "Só o que é meu" : "A casa toda"}
            icone={<Filtro className="h-3.5 w-3.5" />}
          >
            {(fechar) => (
              <div className="flex w-52 flex-col gap-1">
                <ItemPopup
                  ativo={!soMeu}
                  aoEscolher={() => {
                    setSoMeu(false);
                    fechar();
                  }}
                >
                  A casa toda
                </ItemPopup>
                <ItemPopup
                  ativo={soMeu}
                  aoEscolher={() => {
                    setSoMeu(true);
                    fechar();
                  }}
                >
                  Só o que é meu
                </ItemPopup>
              </div>
            )}
          </Popup>

          {faixa !== "tudo" && (
            <button className="aba aba-ativa" onClick={() => setFaixa("tudo")}>
              ver o dia todo ×
            </button>
          )}

          <span
            className="ml-auto text-[0.7rem]"
            style={{ color: "var(--ink-soft)" }}
          >
            âncoras {ancorasFeitas}/{ancoras.length}
          </span>

          <Ajustes />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:items-start lg:gap-9">
          {/* O dia, em faixas */}
          <div className="flex flex-col gap-7">
            {visiveis.length === 0 && (
              <Vazio>
                {soMeu
                  ? "Nada é só seu hoje. Trocar pra “a casa toda” mostra o mural."
                  : "Nada previsto pra hoje."}
              </Vazio>
            )}

            {faixa === "tudo" ? (
              FAIXAS.map((f) => (
                <FaixaDoDia
                  key={f}
                  faixa={f}
                  agora={f === faixaAgora}
                  ocorrencias={visiveis.filter((o) => faixaDe(o) === f)}
                  marcas={marcas}
                  acoes={acoes}
                  aoFocar={() => setFaixa(f)}
                />
              ))
            ) : (
              <FaixaDoDia
                faixa={faixa}
                agora={faixa === faixaAgora}
                ocorrencias={visiveis}
                marcas={marcas}
                acoes={acoes}
              />
            )}

            <Agendar data={hoje} eu={estado.eu} />
          </div>

          {/* Coluna de contexto */}
          <aside className="mt-9 flex flex-col gap-6 lg:mt-0">
            {bloqueio && (
              <section className="surface-card-dark p-5">
                <p
                  className="tv-rotulo mb-2"
                  style={{ color: "var(--surface-dark-foreground)", opacity: 0.6 }}
                >
                  O que está travando
                </p>
                <p
                  className="text-[1.1rem] leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {bloqueio.titulo}
                </p>
                <p className="mt-1.5 text-sm" style={{ opacity: 0.7 }}>
                  {bloqueio.nota} · {bloqueio.responsavel}
                </p>
              </section>
            )}

            <section className="so-modo-cheio">
              <Rotulo>A semana da casa</Rotulo>
              <Placar hoje={hoje} conclusoes={estado.conclusoes} />
            </section>

            <section>
              <Rotulo>
                {soMeu ? "Suas pendências" : "Pendências da casa"} (
                {minhasPendencias.length})
              </Rotulo>
              <Pendencias
                pendencias={minhasPendencias}
                hoje={hoje}
                vazio={soMeu ? "Nenhuma pendência sua." : "Nenhuma pendência aberta."}
              />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

/** Uma faixa do dia: a qualquer hora, manhã, tarde ou noite.

    A faixa da hora atual ganha um contorno de acento. É a única pista de "onde
    estamos agora" que a tela dá, e ela some quando o dia vira.

    A faixa "a qualquer hora" fica sempre no topo e nunca é a faixa "de agora":
    ela não pertence a um momento, é o que está disponível o dia inteiro. */
function FaixaDoDia({
  faixa,
  ocorrencias,
  marcas,
  acoes,
  agora,
  aoFocar,
}: {
  faixa: Faixa;
  ocorrencias: Ocorrencia[];
  marcas: Marcas;
  acoes: (o: Ocorrencia) => Omit<
    React.ComponentProps<typeof Linha>,
    "ocorrencia"
  >;
  agora: boolean;
  aoFocar?: () => void;
}) {
  /* Faixa vazia some, porque o dia da casa quase nunca usa as quatro e uma
     fileira de "nada aqui" empurra o conteúdo real pra baixo da dobra. */
  if (ocorrencias.length === 0) return null;

  const feitas = ocorrencias.filter((o) => marcas.feitas.has(o.chave)).length;

  return (
    <section
      className="faixa-bloco"
      style={{
        borderColor: agora && faixa !== "solto" ? "var(--accent)" : "transparent",
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CabecalhoFaixa faixa={faixa} feitas={feitas} total={ocorrencias.length} />
        </div>
        {aoFocar && (
          <button
            onClick={aoFocar}
            className="mt-0.5 flex-none text-[0.68rem] underline underline-offset-4"
            style={{ color: "var(--ink-soft)" }}
          >
            só isto
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {ocorrencias.map((o) => (
          <Linha key={o.chave} ocorrencia={o} {...acoes(o)} />
        ))}
      </ul>
    </section>
  );
}

function ItemPopup({
  children,
  ativo,
  aoEscolher,
}: {
  children: React.ReactNode;
  ativo: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      onClick={aoEscolher}
      className="item-popup"
      style={{
        background: ativo ? "var(--accent)" : "transparent",
        color: ativo ? "var(--accent-foreground)" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

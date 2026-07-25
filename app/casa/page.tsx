"use client";

import { useMemo, useState } from "react";
import Linha from "@/components/Linha";
import { Avatar, Rotulo, Vazio } from "@/components/ui";
import { Check, Lixeira, Mais } from "@/components/icones";
import {
  donoNoDia,
  estadoDa,
  indexar,
  ocorrenciasDoDia,
  proximoDono,
  valeNoDia,
} from "@/lib/agenda";
import { curta, diasDaSemana, porExtenso, semanaISO } from "@/lib/datas";
import {
  adicionarNaLista,
  alternarConclusao,
  alternarItemDaLista,
  limparComprados,
  pular,
  removerDaLista,
  useHoje,
  useZuppas,
} from "@/lib/store";
import { type ItemRecorrente } from "@/lib/types";

/* A casa: quem faz o quê, e a lista de compras.

   Existe porque a [[Rotina - Família (Semana 1)]] já resolvia isso no papel
   desde 16/06 e nada tinha chegado ao app: donos fixos (louça e lixo do André),
   rodízio semanal de varrer/pano e banheiros entre Yan, Ge e Camilla, e os três
   passeios do Biro com dono por turno.

   A prévia de "semana que vem" não é enfeite. A pesquisa de rodízio é direta
   nisso: saber o que vem evita a discussão de "por que sempre eu", e a tensão
   familiar cresce justamente na lacuna entre "achei que estava feito" e "nunca
   vi acontecer". */

export default function Casa() {
  const estado = useZuppas();
  const hoje = useHoje();
  const [novo, setNovo] = useState("");

  const marcas = useMemo(() => indexar(estado.conclusoes), [estado.conclusoes]);

  const doDia = useMemo(
    () => ocorrenciasDoDia(hoje, estado.itens, estado.compromissos),
    [hoje, estado.itens, estado.compromissos]
  );

  const biro = doDia.filter((o) => o.categoria === "biro");
  const tarefas = doDia.filter((o) => o.categoria === "casa");

  const rodizios = estado.itens.filter((i) => i.rodizio && i.rodizio.length > 0);

  const abertos = estado.lista.filter((i) => !i.feito);
  const comprados = estado.lista.filter((i) => i.feito);

  function adicionar() {
    const limpo = novo.trim();
    if (!limpo) return;
    adicionarNaLista(limpo, estado.eu);
    setNovo("");
  }

  return (
    <main className="veil-bg pb-28 lg:pb-16">
      <div className="mx-auto w-full max-w-md px-5 pt-8 lg:max-w-[1400px] lg:px-10 lg:pt-10">
        <header className="mb-7">
          <p className="tv-rotulo mb-2">{porExtenso(hoje)}</p>
          <h1
            className="text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.1 }}
          >
            A casa
          </h1>
        </header>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-8">
            {/* Rodízio da semana */}
            <section>
              <Rotulo>De quem é a vez (semana {semanaISO(hoje)})</Rotulo>
              <ul className="flex flex-col gap-2">
                {rodizios.map((item) => (
                  <LinhaRodizio key={item.id} item={item} hoje={hoje} />
                ))}
              </ul>
              <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                Gira sozinho toda segunda. Ninguém precisa combinar.
              </p>
            </section>

            {/* Biro */}
            <section>
              <Rotulo>Biro, hoje</Rotulo>
              {biro.length === 0 ? (
                <Vazio>Nenhum passeio previsto.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {biro.map((o) => (
                    <Linha
                      key={o.chave}
                      ocorrencia={o}
                      estado={estadoDa(o.chave, marcas)}
                      aoMarcar={() => alternarConclusao(o.id, hoje, estado.eu)}
                      aoPular={() => pular(o.id, hoje, estado.eu)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Tarefas de casa do dia */}
            <section>
              <Rotulo>Tarefas de hoje</Rotulo>
              {tarefas.length === 0 ? (
                <Vazio>Nada de casa hoje.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {tarefas.map((o) => (
                    <Linha
                      key={o.chave}
                      ocorrencia={o}
                      estado={estadoDa(o.chave, marcas)}
                      aoMarcar={() => alternarConclusao(o.id, hoje, estado.eu)}
                      aoPular={() => pular(o.id, hoje, estado.eu)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-8">
            {/* Lista de compras */}
            <section>
              <Rotulo>Lista da casa ({abertos.length})</Rotulo>

              <div className="mb-3 flex gap-2">
                <input
                  className="campo"
                  placeholder="Faltou o quê?"
                  value={novo}
                  onChange={(e) => setNovo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") adicionar();
                  }}
                />
                <button
                  className="botao flex-none px-4"
                  onClick={adicionar}
                  disabled={!novo.trim()}
                  aria-label="Adicionar na lista"
                >
                  <Mais />
                </button>
              </div>

              {abertos.length === 0 && comprados.length === 0 ? (
                <Vazio>Lista vazia. Escreve aí o que faltar.</Vazio>
              ) : (
                <div className="glass-card p-4">
                  <ul className="flex flex-col gap-2.5">
                    {abertos.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5">
                        <button
                          onClick={() => alternarItemDaLista(item.id)}
                          className="h-5 w-5 flex-none rounded-full border"
                          style={{ borderColor: "var(--line)" }}
                          aria-label={`Marcar ${item.titulo} como comprado`}
                        />
                        <span className="text-[0.95rem]">{item.titulo}</span>
                        <span
                          className="ml-auto text-[0.7rem]"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          {item.por}
                        </span>
                        <button
                          onClick={() => removerDaLista(item.id)}
                          style={{ color: "var(--ink-soft)" }}
                          aria-label={`Apagar ${item.titulo}`}
                        >
                          <Lixeira />
                        </button>
                      </li>
                    ))}

                    {comprados.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5">
                        <button
                          onClick={() => alternarItemDaLista(item.id)}
                          className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
                          style={{
                            background: "var(--accent)",
                            color: "var(--accent-foreground)",
                          }}
                          aria-label={`Desmarcar ${item.titulo}`}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <span
                          className="text-[0.95rem]"
                          style={{ opacity: 0.45, textDecoration: "line-through" }}
                        >
                          {item.titulo}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {comprados.length > 0 && (
                    <button
                      onClick={limparComprados}
                      className="mt-3 text-xs underline underline-offset-4"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      limpar os {comprados.length} comprados
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Ritual de fim de semana */}
            <section>
              <Rotulo>Ritual de fim de semana</Rotulo>
              <RitualDaSemana hoje={hoje} itens={estado.itens} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function LinhaRodizio({ item, hoje }: { item: ItemRecorrente; hoje: string }) {
  const dono = donoNoDia(item, hoje);
  const proximo = proximoDono(item, hoje);

  return (
    <li className="glass-card flex items-center gap-3 p-4">
      <Avatar dono={dono} tamanho={34} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[1rem] leading-tight">{item.titulo}</span>
        <span className="text-[0.75rem]" style={{ color: "var(--ink-soft)" }}>
          {dono} esta semana
          {proximo && proximo !== dono ? ` · ${proximo} na próxima` : ""}
        </span>
      </span>
    </li>
  );
}

/** O que a semana pede no fim: mercado, marmitas e os 30 minutos de domingo.
    Fica aqui e não na tela de hoje porque é planejamento, não execução. */
function RitualDaSemana({ hoje, itens }: { hoje: string; itens: ItemRecorrente[] }) {
  const dias = diasDaSemana(hoje);
  const fds = dias.slice(4); // sexta, sábado, domingo

  const linhas = fds.flatMap((dia) =>
    itens
      .filter((i) => i.categoria === "casa" && valeNoDia(i, dia))
      .filter((i) => i.recorrencia.tipo === "semanal")
      .map((i) => ({ dia, item: i }))
  );

  if (linhas.length === 0) {
    return <Vazio>Nada marcado pro fim de semana.</Vazio>;
  }

  return (
    <ul className="glass-card flex flex-col gap-2 p-4">
      {linhas.map(({ dia, item }) => (
        <li key={`${item.id}|${dia}`} className="flex items-baseline gap-3">
          <span
            className="w-12 flex-none text-[0.7rem] uppercase tracking-widest"
            style={{ color: "var(--ink-soft)" }}
          >
            {curta(dia)}
          </span>
          <span className="text-[0.95rem] leading-snug">{item.titulo}</span>
          <span className="ml-auto text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>
            {donoNoDia(item, dia)}
          </span>
        </li>
      ))}
    </ul>
  );
}

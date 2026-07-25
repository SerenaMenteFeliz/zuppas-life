"use client";

import { useMemo, useState } from "react";
import Linha from "@/components/Linha";
import Placar from "@/components/Placar";
import { Rotulo, Vazio } from "@/components/ui";
import { Check, Lixeira, Mais } from "@/components/icones";
import {
  estadoDa,
  indexar,
  ocorrenciasDoDia,
  quemFez,
  quemPegou,
  valeNoDia,
} from "@/lib/agenda";
import { curta, diasDaSemana, porExtenso } from "@/lib/datas";
import {
  adicionarNaLista,
  alternarConclusao,
  alternarItemDaLista,
  limparComprados,
  pegar,
  pular,
  removerDaLista,
  useHoje,
  useZuppas,
} from "@/lib/store";
import { type ItemRecorrente } from "@/lib/types";

/* A casa: o mural do dia, quem está dividindo o quê, e a lista de compras.

   Reescrita em 25/07. A tela nasceu em 24/07 mostrando a escala: rodízio
   semanal de varrer e banheiro entre Yan, Ge e Camilla, com prévia de quem
   pegava na semana seguinte. O Yan desligou a escala inteira: numa casa onde a
   semana de cada um é diferente, "é a sua vez no sábado" só produz tarefa não
   feita com nome de culpado.

   No lugar entrou o modelo que ele descreveu: a tarefa fica aberta e quem
   marcar pegou aquela. A escala virou placar, que é a mesma informação lida
   depois em vez de decidida antes, e sem o efeito de escalar quem não podia. */

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

  const abertos = estado.lista.filter((i) => !i.feito);
  const comprados = estado.lista.filter((i) => i.feito);

  function acoes(o: (typeof doDia)[number]) {
    return {
      estado: estadoDa(o.chave, marcas),
      fez: quemFez(o.chave, marcas),
      pegou: quemPegou(o.chave, marcas),
      eu: estado.eu,
      aoMarcar: () => alternarConclusao(o.id, hoje, estado.eu),
      aoPegar: () => pegar(o.id, hoje, estado.eu),
      aoPular: () => pular(o.id, hoje, estado.eu),
    };
  }

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
            {/* Como a casa está dividindo */}
            <section>
              <Rotulo>Como a casa está dividindo</Rotulo>
              <Placar hoje={hoje} conclusoes={estado.conclusoes} />
            </section>

            {/* Biro */}
            <section>
              <Rotulo>Biro, hoje ({biro.length} passeios)</Rotulo>
              {biro.length === 0 ? (
                <Vazio>Nenhum passeio previsto.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {biro.map((o) => (
                    <Linha key={o.chave} ocorrencia={o} {...acoes(o)} />
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                Nenhum tem dono. Quem for, toca na mão pra avisar que pegou.
              </p>
            </section>

            {/* Tarefas de casa do dia */}
            <section>
              <Rotulo>Tarefas de hoje</Rotulo>
              {tarefas.length === 0 ? (
                <Vazio>Nada de casa hoje.</Vazio>
              ) : (
                <ul className="flex flex-col gap-2">
                  {tarefas.map((o) => (
                    <Linha key={o.chave} ocorrencia={o} {...acoes(o)} />
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
            {item.dono === "Casa" ? "mural" : item.dono}
          </span>
        </li>
      ))}
    </ul>
  );
}

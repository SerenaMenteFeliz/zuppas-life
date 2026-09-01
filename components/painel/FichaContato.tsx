"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { avisar } from "@/components/painel/Avisos";
import {
  excluirContatoAcao,
  medirEstragoAcao,
  salvarContatoAcao,
} from "@/app/painel/contatos/acoes";
import { OFERTA_COR, OFERTA_ROTULO, type Estrago, type Pessoa } from "@/lib/painel-contatos";

/* Ficha do contato, em popup no meio da tela (Yan, 01/09/2026).

   Antes, clicar numa pessoa expandia a linha ali mesmo. Três coisas erradas
   nisso, e a terceira é a que decidiu:

   1. **A ficha competia com a lista pelo mesmo espaço.** Abrir uma pessoa
      empurrava as outras pra baixo, e comparar duas exigia rolar entre elas.
   2. **O dado não cabia.** A linha aberta mostrava quatro campos; a pessoa tem
      identidade, origem de campanha, compras, acessos, uso do app e uma linha
      do tempo. Isso não é um detalhe de linha, é uma tela.
   3. **Não havia onde pôr ação destrutiva.** Excluir dentro de uma linha que
      expande é botão perigoso a um clique de distância do gesto mais comum da
      tela, que é abrir e fechar gente pra olhar.

   O popup para tudo, mostra tudo, e é o único lugar onde apagar existe.

   Nada de portal: a ficha nasce dentro da árvore do painel, como o
   ModalConfirmar. Elemento portalado pro `body` sai do escopo do tema e perde
   as variáveis de CSS (achado em 01/09/2026 no popover da aba de Conteúdo). */

function data(iso: string | null) {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dinheiro(centavos: number) {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

/** Frase do que a exclusão leva embora, montada só com o que existe. Item
    zerado não vira "0 aulas": ele simplesmente não aparece, senão a lista de
    perdas fica com sete zeros e o pedido pago se esconde no meio. */
function contarEstrago(e: Estrago): string[] {
  const partes: string[] = [];
  if (e.eventosLead > 0) partes.push(e.eventosLead === 1 ? "1 evento de lead" : `${e.eventosLead} eventos de lead`);
  if (e.cobrancasPix > 0) partes.push(e.cobrancasPix === 1 ? "1 cobrança Pix" : `${e.cobrancasPix} cobranças Pix`);
  if (e.acessos > 0) partes.push(e.acessos === 1 ? "1 acesso a produto" : `${e.acessos} acessos a produto`);
  if (e.eventosApp > 0) partes.push(`${e.eventosApp} registros de uso do app`);
  if (e.aulas > 0) partes.push(e.aulas === 1 ? "1 aula concluída" : `${e.aulas} aulas concluídas`);
  if (e.leituras > 0) partes.push("o progresso de leitura");
  if (e.pedidos > 0) {
    partes.push(e.pedidos === 1 ? "1 pedido da Biblioteca" : `${e.pedidos} pedidos da Biblioteca`);
  }
  return partes;
}

export default function FichaContato({ pessoa, fechar }: { pessoa: Pessoa; fechar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [estrago, setEstrago] = useState<Estrago | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const [nome, setNome] = useState(pessoa.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(pessoa.whatsapp ?? "");
  const [email, setEmail] = useState(pessoa.email);

  const caixa = useRef<HTMLDivElement>(null);
  const fecharBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      /* Escape não fecha no meio de uma gravação: a ação continuaria rodando e
         a pessoa acharia que cancelou. */
      if (e.key === "Escape" && !pendente) {
        if (confirmando) setConfirmando(false);
        else fechar();
      }
    };
    document.addEventListener("keydown", tecla);

    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    fecharBtn.current?.focus();

    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = rolagem;
    };
  }, [confirmando, fechar, pendente]);

  /* O estrago é medido quando a confirmação abre, não quando a ficha abre: são
     sete consultas, e a maioria das aberturas de ficha é só pra olhar. */
  useEffect(() => {
    if (!confirmando || estrago) return;
    let vivo = true;
    medirEstragoAcao(pessoa.email).then((e) => {
      if (vivo) setEstrago(e);
    });
    return () => {
      vivo = false;
    };
  }, [confirmando, estrago, pessoa.email]);

  const salvar = () => {
    setErro(null);
    iniciar(async () => {
      const r = await salvarContatoAcao(pessoa.email, { nome, whatsapp, email });
      if (r.ok) {
        avisar("Contato atualizado.");
        setEditando(false);
        fechar();
      } else {
        setErro(r.erro);
      }
    });
  };

  const excluir = () => {
    setErro(null);
    iniciar(async () => {
      const r = await excluirContatoAcao(pessoa.email);
      if (r.ok) {
        avisar("Contato apagado.");
        fechar();
      } else {
        setErro(r.erro);
      }
    });
  };

  const perdas = estrago ? contarEstrago(estrago) : [];

  return (
    <div
      className="pn-ficha-fundo"
      /* Fecha só quando o clique nasce E termina no fundo: arrastar uma seleção
         de texto de dentro da ficha pra fora soltaria o mouse aqui. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pendente) fechar();
      }}
    >
      <div className="pn-ficha" role="dialog" aria-modal="true" aria-label={pessoa.nome ?? pessoa.email} ref={caixa}>
        <header className="pn-ficha-topo">
          <div className="min-w-0">
            <h2 className="pn-ficha-nome">{pessoa.nome ?? pessoa.email}</h2>
            <p className="pn-ficha-email">{pessoa.email}</p>
            <div className="pn-ficha-chips">
              {pessoa.ofertas.length === 0 ? (
                <span className="pn-ficha-chip" style={{ background: "rgba(120,110,160,.13)" }}>
                  nenhuma oferta ainda
                </span>
              ) : (
                pessoa.ofertas.map((o) => (
                  <span key={o} className="pn-ficha-chip" style={{ background: OFERTA_COR[o] }}>
                    {OFERTA_ROTULO[o]}
                  </span>
                ))
              )}
            </div>
          </div>
          <button
            ref={fecharBtn}
            type="button"
            className="pn-ficha-fechar"
            onClick={fechar}
            disabled={pendente}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="pn-ficha-corpo">
          {editando ? (
            <section className="pn-ficha-bloco">
              <h3 className="pn-ficha-titulo">Corrigir dados</h3>
              <label className="pn-ficha-campo">
                <span>Nome</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={pendente} />
              </label>
              <label className="pn-ficha-campo">
                <span>WhatsApp</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={pendente} />
              </label>
              <label className="pn-ficha-campo">
                <span>E-mail</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={pendente} />
              </label>
              {/* O aviso é específico porque o risco é específico: o resto do
                  banco aponta pro id e segue sozinho, só o pedido da Biblioteca
                  casa por e-mail, e ele é atualizado junto. */}
              <p className="pn-ficha-aviso">
                Trocar o e-mail leva junto os pedidos da Biblioteca desta pessoa. O resto do banco
                aponta pro cadastro e segue sozinho. Se o e-mail novo já for de outra pessoa, a
                troca é recusada: juntar dois históricos não é correção, é palpite.
              </p>
            </section>
          ) : (
            <>
              <section className="pn-ficha-bloco">
                <h3 className="pn-ficha-titulo">Identidade</h3>
                <dl className="pn-ficha-dados">
                  <Dado rotulo="WhatsApp" valor={pessoa.whatsapp ?? "não informado"} />
                  <Dado rotulo="CPF" valor={pessoa.cpf ?? "não informado"} />
                  <Dado rotulo="Login no app" valor={pessoa.temLogin ? "sim" : "não"} />
                  <Dado rotulo="Cadastro" valor={pessoa.contactId ? "sim" : "só pedido da Biblioteca"} />
                  <Dado rotulo="Primeiro contato" valor={data(pessoa.primeiroContato)} />
                  <Dado rotulo="Última atividade" valor={data(pessoa.ultimaAtividade)} />
                </dl>
              </section>

              <section className="pn-ficha-bloco">
                <h3 className="pn-ficha-titulo">Dinheiro e acesso</h3>
                <dl className="pn-ficha-dados">
                  <Dado
                    rotulo="Já gastou"
                    valor={pessoa.gastoCentavos > 0 ? dinheiro(pessoa.gastoCentavos) : "nada"}
                  />
                  <Dado rotulo="Pedidos pagos" valor={String(pessoa.pedidosPagos)} />
                  <Dado rotulo="Pedidos em aberto" valor={String(pessoa.pedidosAbertos)} />
                  <Dado rotulo="Gerou Pix" valor={pessoa.gerouPix ? "sim" : "não"} />
                  <Dado
                    rotulo="Acessos liberados"
                    valor={
                      pessoa.acessos.length === 0
                        ? "nenhum"
                        : pessoa.acessos.map((a) => `${a.produto}${a.status ? ` (${a.status})` : ""}`).join(", ")
                    }
                  />
                </dl>
              </section>

              <section className="pn-ficha-bloco">
                <h3 className="pn-ficha-titulo">Dentro do app</h3>
                {pessoa.app.ultimoUso === null ? (
                  <p className="pn-ficha-vazio">Nunca abriu o app.</p>
                ) : (
                  <dl className="pn-ficha-dados">
                    <Dado rotulo="Capítulos lidos" valor={String(pessoa.app.capitulosLidos)} />
                    <Dado rotulo="Aulas concluídas" valor={String(pessoa.app.aulasConcluidas)} />
                    <Dado rotulo="Último uso" valor={data(pessoa.app.ultimoUso)} />
                    {pessoa.app.leitura.map((l) => (
                      <Dado
                        key={l.produto}
                        rotulo={`Leitura (${l.produto})`}
                        valor={l.concluido ? "concluída" : `no capítulo ${l.capitulo}`}
                      />
                    ))}
                  </dl>
                )}
              </section>

              <section className="pn-ficha-bloco">
                <h3 className="pn-ficha-titulo">De onde veio</h3>
                <dl className="pn-ficha-dados">
                  <Dado rotulo="Origem" valor={pessoa.origem ?? "não registrada"} />
                  <Dado rotulo="Campanha" valor={pessoa.utm?.campanha ?? "não registrada"} />
                  <Dado rotulo="Meio" valor={pessoa.utm?.medium ?? "não registrado"} />
                  <Dado rotulo="Conteúdo" valor={pessoa.utm?.conteudo ?? "não registrado"} />
                  <Dado rotulo="Resultado do quiz" valor={pessoa.resultadoQuiz ?? "não fez"} />
                </dl>
              </section>

              <section className="pn-ficha-bloco">
                <h3 className="pn-ficha-titulo">Linha do tempo</h3>
                {pessoa.eventos.length === 0 ? (
                  <p className="pn-ficha-vazio">Nenhum evento registrado.</p>
                ) : (
                  <ol className="pn-ficha-tempo">
                    {pessoa.eventos.map((ev, i) => (
                      <li key={i}>
                        <span
                          className="pn-ficha-ponto"
                          style={{ background: ev.oferta ? OFERTA_COR[ev.oferta] : "rgba(120,110,160,.30)" }}
                        />
                        <span className="pn-ficha-quando">{data(ev.quando)}</span>
                        <span className="pn-ficha-rotulo">{ev.rotulo}</span>
                        {ev.detalhe && <span className="pn-ficha-detalhe">{ev.detalhe}</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}

          {erro && <p className="pn-ficha-erro">{erro}</p>}
        </div>

        <footer className="pn-ficha-rodape">
          {confirmando ? (
            <div className="conteudo-confirma">
              <p className="conteudo-confirma-pergunta">
                {estrago === null ? (
                  "Conferindo o que vai junto..."
                ) : (
                  <>
                    Apagar <b>{pessoa.email}</b> de tudo.{" "}
                    {perdas.length > 0 ? `Vão junto ${perdas.join(", ")}.` : "Não há nada ligado a ela."}
                    {estrago.pedidosPagos > 0 && (
                      <>
                        {" "}
                        <b>
                          {estrago.pedidosPagos === 1
                            ? "1 pedido pago"
                            : `${estrago.pedidosPagos} pedidos pagos`}{" "}
                          de {dinheiro(estrago.centavosPagos)} some da receita.
                        </b>
                      </>
                    )}
                    {estrago.temLogin && " O login dela no app continua existindo, sem cadastro."}{" "}
                    Não tem como desfazer.
                  </>
                )}
              </p>
              <div className="conteudo-confirma-botoes">
                <button
                  type="button"
                  className="conteudo-confirma-nao"
                  disabled={pendente}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="conteudo-confirma-sim"
                  disabled={pendente || estrago === null}
                  onClick={excluir}
                >
                  {pendente ? "Apagando..." : "Sim, apagar"}
                </button>
              </div>
            </div>
          ) : editando ? (
            <>
              <button
                type="button"
                className="conteudo-confirma-nao"
                disabled={pendente}
                onClick={() => {
                  setEditando(false);
                  setErro(null);
                  setNome(pessoa.nome ?? "");
                  setWhatsapp(pessoa.whatsapp ?? "");
                  setEmail(pessoa.email);
                }}
              >
                Cancelar
              </button>
              <button type="button" className="conteudo-botao" disabled={pendente} onClick={salvar}>
                {pendente ? "Salvando..." : "Salvar"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="conteudo-botao-perigo"
                onClick={() => setConfirmando(true)}
              >
                Excluir contato
              </button>
              <button type="button" className="conteudo-botao-claro" onClick={() => setEditando(true)}>
                Corrigir dados
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="pn-ficha-dado">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

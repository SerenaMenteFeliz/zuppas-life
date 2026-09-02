"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { marcarFalaAcao } from "@/app/painel/conteudo/acoes";
import { Check } from "@/components/icones";
import { avisar } from "@/components/painel/Avisos";
import { resumoDaCena, temCena, tituloDe, type Fala, type Post } from "@/lib/conteudo-tipos";

/* Modo gravação: o roteiro pra LER, não pra escrever (02/09/2026).

   ── Por que é uma tela e não a de edição arrumada ──

   A tela do post é um editor, e as duas coisas competem pelo mesmo espaço. Cada
   fala lá carrega textarea que cresce, dropdown de função, o <details> da cena,
   a lista de b-roll, as setas de mover e a lixeira. Medido em 386x396, que é o
   quadrado da tela dividida do celular: um card de fala tinha 415px, ou seja,
   UMA fala não cabia na tela inteira, e a página somava 5.538px de rolagem pra
   12 falas.

   Quem está gravando não precisa de nada disso. Precisa de ler a frase, ver a
   próxima chegando e marcar que já saiu. Então esta tela só faz isso.

   ── Por que a lista rolável, e não uma fala por vez ──

   Escolha do Yan em 02/09/2026, entre as duas. Teleprompter de uma frase por
   tela ganha em corpo de letra e perde no que importa aqui: emendar. Vendo a
   próxima frase chegando dá pra encadear a fala sem cortar; vendo uma só, cada
   troca é um corte.

   ── Por que marcar NÃO manda o roteiro inteiro ──

   Ver `marcarFalaGravada` em lib/conteudo.ts. Resumo: a Ge escreve no
   computador e grava pelo celular. Se marcar do celular reenviasse as N falas,
   a cópia que o celular carregou ao abrir a tela sobrescreveria o texto que ela
   estivesse corrigindo do outro lado.

   ── Só leitura ──

   Decisão do Yan: aqui não se edita texto. Corrigir a frase continua na tela do
   post. É o que tira o teclado do caminho e o que impede um esbarrão de apagar
   uma frase com o celular na mão no meio de uma tomada. */

export default function Gravacao({
  post,
  iniciais,
  voltarPara,
}: {
  post: Post;
  iniciais: Fala[];
  /** A tela do post, já com o recorte da lista de onde a pessoa veio. */
  voltarPara: string;
}) {
  const [falas, setFalas] = useState<Fala[]>(iniciais);

  /* Onde a tela abre: na primeira fala que ainda não foi gravada. Congelado no
     primeiro render, a partir do que veio do servidor, e nunca recalculado. Se
     acompanhasse o estado atual, marcar uma fala moveria o alvo e a lista
     pularia sozinha embaixo do dedo. Tudo gravado (ou nada gravado) dá -1 ou 0
     e a tela abre no começo, que é o certo pros dois casos.

     `useState` com inicializador, e não `useRef`, porque este valor é LIDO
     durante o render (pra saber em qual <li> pendurar o alvo) e ler ref no
     render é o que o react-hooks/refs proíbe, com razão: ref não avisa o React
     quando muda, então quem lê no render pode ler um valor de outro momento. */
  const [comecarEm] = useState(() => iniciais.findIndex((f) => !f.gravada));
  const alvo = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (comecarEm > 0) alvo.current?.scrollIntoView({ block: "start" });
  }, [comecarEm]);

  const gravadas = falas.filter((f) => f.gravada).length;

  async function alternar(i: number) {
    const fala = falas[i];
    /* Fala sem id é fala que nunca chegou no banco. Não deveria existir aqui
       (esta tela só lê o que o servidor mandou), mas marcar uma não faria nada
       e a tela mentiria dizendo que fez. */
    if (!fala?.id) return;

    const novo = !fala.gravada;
    /* Otimista: o ✓ aparece na hora. Quem está gravando toca e já olha pra
       câmera de novo, então esperar a rede pra pintar seria esperar no pior
       momento possível. Se a gravação falhar, o estado volta e o aviso conta. */
    setFalas((a) => a.map((f, k) => (k === i ? { ...f, gravada: novo } : f)));
    try {
      await marcarFalaAcao(post.id, fala.id, novo);
    } catch {
      setFalas((a) => a.map((f, k) => (k === i ? { ...f, gravada: !novo } : f)));
      avisar("Não deu pra marcar essa fala. Confira a internet e toque de novo.", "erro");
    }
  }

  return (
    <div className="gravar-casca">
      {/* Topo curto de propósito: duas linhas baixas, porque cada pixel aqui é
          um pixel a menos de roteiro. O título fica porque é o que diz QUAL
          post está aberto quando há dois parecidos na fila do dia. */}
      <header className="gravar-topo">
        <div className="gravar-topo-linha">
          <Link href={voltarPara} className="gravar-voltar" aria-label="Voltar pro post">
            ‹
          </Link>
          <h1 className="gravar-titulo">{tituloDe(post)}</h1>
        </div>

        {falas.length > 0 && (
          <div className="gravar-progresso">
            {/* A barra responde "falta muito?" de relance, sem ler número. A
                contagem ao lado responde "quantas exatamente", que é a pergunta
                de quem está decidindo se dá tempo de terminar. */}
            <span
              className="gravar-barra"
              role="progressbar"
              aria-valuenow={gravadas}
              aria-valuemin={0}
              aria-valuemax={falas.length}
              aria-label="Falas gravadas"
            >
              <span
                className="gravar-barra-cheia"
                style={{ width: (gravadas / falas.length) * 100 + "%" }}
              />
            </span>
            <span className="gravar-conta">
              {gravadas} de {falas.length}
            </span>
          </div>
        )}
      </header>

      {falas.length === 0 ? (
        <div className="gravar-vazio">
          <p>Este post ainda não tem roteiro.</p>
          <Link href={voltarPara} className="conteudo-botao-claro">
            Escrever o roteiro
          </Link>
        </div>
      ) : (
        <ol className="gravar-lista">
          {falas.map((fala, i) => (
            <li
              key={fala.id ?? "sem-id-" + i}
              ref={i === comecarEm ? alvo : undefined}
              className={"gravar-fala" + (fala.gravada ? " gravar-fala-ok" : "")}
            >
              {/* A frase inteira é o alvo, e é enorme de propósito: o gesto
                  acontece com o celular na mão, entre uma tomada e outra, e um
                  alvo pequeno nesse momento vira toque errado. Tocar de novo
                  desmarca, então errar custa um toque. */}
              <button
                type="button"
                className="gravar-fala-toque"
                aria-pressed={fala.gravada}
                aria-label={
                  "Fala " +
                  (i + 1) +
                  (fala.gravada ? ", gravada. Tocar desmarca" : ". Tocar marca como gravada")
                }
                onClick={() => alternar(i)}
              >
                <span className="gravar-fala-marca" aria-hidden>
                  {fala.gravada ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="gravar-fala-texto">
                  {fala.texto.trim() === "" ? "Fala em branco" : fala.texto}
                </span>
              </button>

              {/* A cena fica fechada, numa linha só. Aberta ela ocupa o lugar da
                  próxima fala, e o que se lê 90% do tempo é o texto falado. Sem
                  cena planejada a linha nem nasce: linha dizendo "Cena não
                  planejada" seria altura gasta pra não informar nada. */}
              {temCena(fala) && (
                <details className="gravar-cena">
                  <summary>{resumoDaCena(fala)}</summary>
                  {fala.observacao && <p className="gravar-cena-obs">{fala.observacao}</p>}
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

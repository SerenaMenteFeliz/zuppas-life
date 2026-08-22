"use client";

import { useEffect, useRef, useState } from "react";
import { gerarRoteiroAcao, importarRoteiroAcao } from "@/app/painel/conteudo/acoes-ia";
import { avisar } from "@/components/painel/Avisos";
import { FUNCAO_INFO, type FuncaoFala } from "@/lib/conteudo-tipos";
import { localPorId, podeGerar } from "@/lib/ia/inteligencia";
import type { RoteiroDaIA } from "@/lib/ia/roteiro";

/* Os dois botões de IA do roteiro, e a prévia que eles abrem.

   ── Por que existe prévia, e por que ela não é opcional ──

   O caminho óbvio seria "clicou, apareceu no roteiro". Ele está errado aqui por
   uma razão medida: em 22/08 esta tela fechou um caso de perda silenciosa de
   roteiro. Escrever direto no editor 12 falas que a pessoa ainda não viu é
   colocar trabalho de máquina no meio do trabalho dela sem uma porta de saída.

   Com a prévia, o pior caso é clicar em Cancelar. Sem ela, o pior caso é
   descobrir depois que o roteiro tem coisa que ninguém aprovou.

   ── Por que ADICIONA e nunca substitui ──

   Importar duas vezes por engano deixa falas repetidas: visível, chato, e
   resolvido apagando. Substituir por engano apaga roteiro escrito à mão, e não
   tem desfazer. Entre um erro visível e um erro silencioso, o visível ganha
   sempre nesta tela.

   ── Por que fala com o editor por evento ──

   Mesmo mecanismo do `avisar` (ver Avisos.tsx): quem dispara e quem recebe não
   compartilham árvore, e um provider em volta forçaria a página do post a virar
   componente de cliente inteira. */

export const EVENTO_IA = "zl:roteiro-ia";

export type PropostaIA = RoteiroDaIA;

export function despacharProposta(p: PropostaIA) {
  window.dispatchEvent(new CustomEvent(EVENTO_IA, { detail: p }));
}

type Modo = "importar" | "gerar";

export default function RoteiroIA({
  postId,
  perfilId,
  localId,
  ligada,
}: {
  postId: string;
  perfilId: string;
  localId: string | null;
  /* Existe chave do Gemini configurada neste ambiente?

     Sem chave, os dois botões somem inteiros, e isso é diferente do "Gerar
     roteiro" desligado por falta de ficha. A distinção é de quem está olhando:

     - **Falta de ficha** é estado do produto, e o botão desligado com
       explicação é o que faz alguém perguntar e cobrar o que falta.
     - **Falta de chave** é infraestrutura, e um botão que só sabe dizer "a IA
       não está ligada" gasta a curiosidade da Ge numa coisa que ela não pode
       resolver. Pior: ensina que o painel promete o que não cumpre.

     Quem precisa saber que falta chave é o Yan, e ele vê isso na aba
     Inteligência. */
  ligada: boolean;
}) {
  const [modo, setModo] = useState<Modo | null>(null);

  const gerarLiberado = podeGerar(perfilId);

  if (!ligada) return null;

  return (
    <>
      <button type="button" className="conteudo-chip-acao" onClick={() => setModo("importar")}>
        Colar roteiro
      </button>

      {/* O botão de gerar continua VISÍVEL mesmo desligado, e desabilitado com
          explicação no title. Esconder faria a funcionalidade não existir aos
          olhos de quem usa, e aí ninguém pergunta por que ela não está lá nem
          cobra o que falta pra ligar. */}
      <button
        type="button"
        className="conteudo-chip-acao"
        disabled={!gerarLiberado}
        title={
          gerarLiberado
            ? "Escrever um roteiro novo a partir de um briefing"
            : "Ainda desligado: a ficha de voz deste perfil não foi preenchida. Ver a aba Inteligência."
        }
        onClick={() => setModo("gerar")}
      >
        Gerar roteiro
      </button>

      {modo && (
        <Painel
          modo={modo}
          postId={postId}
          localId={localId}
          aoFechar={() => setModo(null)}
        />
      )}
    </>
  );
}

function Painel({
  modo,
  postId,
  localId,
  aoFechar,
}: {
  modo: Modo;
  postId: string;
  localId: string | null;
  aoFechar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [assunto, setAssunto] = useState("");
  const [sentimento, setSentimento] = useState("");
  const [pedido, setPedido] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proposta, setProposta] = useState<PropostaIA | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [origem, setOrigem] = useState<string>("");
  const primeiro = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const local = localPorId(localId);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      /* Escape não fecha durante a chamada: a requisição continuaria correndo e
         gastando cota, e a pessoa acharia que cancelou. */
      if (e.key === "Escape" && !ocupado) aoFechar();
    };
    document.addEventListener("keydown", tecla);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primeiro.current?.focus();
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = rolagem;
    };
  }, [ocupado, aoFechar]);

  async function pedir() {
    setOcupado(true);
    setErro(null);
    try {
      const r =
        modo === "importar"
          ? await importarRoteiroAcao(postId, texto)
          : await gerarRoteiroAcao(postId, { assunto, sentimento, pedido });

      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setProposta(r.resultado.roteiro);
      setAvisos(r.resultado.avisos);
      setOrigem(r.resultado.modelo);
    } finally {
      setOcupado(false);
    }
  }

  function aceitar() {
    if (!proposta) return;
    despacharProposta(proposta);
    avisar(
      proposta.falas.length === 1
        ? "1 fala entrou no roteiro. Confira antes de gravar."
        : proposta.falas.length + " falas entraram no roteiro. Confira antes de gravar.",
    );
    aoFechar();
  }

  const podeEnviar =
    modo === "importar" ? texto.trim().length >= 20 : assunto.trim() !== "";

  return (
    <div
      className="pn-confirma-fundo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !ocupado) aoFechar();
      }}
    >
      <div className="pn-ia" role="dialog" aria-modal="true" aria-label={modo === "importar" ? "Colar roteiro" : "Gerar roteiro"}>
        <h2 className="pn-confirma-titulo">
          {modo === "importar" ? "Colar roteiro" : "Gerar roteiro"}
        </h2>

        {!proposta && (
          <>
            <p className="pn-ia-ajuda">
              {modo === "importar"
                ? "Cole o roteiro do jeito que ele veio. Eu separo em falas e planejo a cena de cada uma. As palavras continuam suas: eu não reescrevo o texto."
                : "Três respostas curtas bastam. O assunto é o tema; o resto é o que decide se o vídeo funciona."}
            </p>

            {/* O local aparece aqui porque ele é a restrição que mais muda o
                resultado, e é editável logo acima nesta mesma tela. Descobrir
                depois da geração que a cena é impossível é o desperdício de
                cota mais fácil de evitar. */}
            <p className="pn-ia-local">
              {local ? (
                <>
                  Cena pensada para <strong>{local.rotulo}</strong> ({local.esforco}).
                </>
              ) : (
                <>
                  Sem local escolhido: vou ficar em cena que dá pra gravar dentro de casa. Escolha
                  o local nos dados do post pra melhorar isso.
                </>
              )}
            </p>

            {modo === "importar" ? (
              <textarea
                ref={primeiro as React.RefObject<HTMLTextAreaElement>}
                className="pn-ia-texto"
                rows={12}
                value={texto}
                placeholder={"Cole aqui.\n\nPode vir com CENA 1, GANCHO:, marcação de tempo, o que for. Eu limpo."}
                onChange={(e) => setTexto(e.target.value)}
              />
            ) : (
              <div className="pn-ia-campos">
                <label className="conteudo-campo">
                  <span>Assunto</span>
                  <input
                    ref={primeiro as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={assunto}
                    placeholder="o cansaço que dormir não resolve"
                    onChange={(e) => setAssunto(e.target.value)}
                  />
                </label>
                <label className="conteudo-campo">
                  <span>O que ela tem que sentir ou entender no fim</span>
                  <input
                    type="text"
                    value={sentimento}
                    placeholder="que o problema não é sono, é o que ela carrega"
                    onChange={(e) => setSentimento(e.target.value)}
                  />
                </label>
                <label className="conteudo-campo">
                  <span>O pedido do vídeo</span>
                  <input
                    type="text"
                    value={pedido}
                    placeholder="salvar pra ver depois"
                    onChange={(e) => setPedido(e.target.value)}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {proposta && (
          <Previa proposta={proposta} avisos={avisos} origem={origem} />
        )}

        {erro && <p className="pn-ia-erro">{erro}</p>}

        <div className="pn-confirma-botoes">
          <button
            type="button"
            className="conteudo-confirma-nao"
            disabled={ocupado}
            onClick={aoFechar}
          >
            Cancelar
          </button>

          {!proposta ? (
            <button
              type="button"
              className="conteudo-confirma-sim"
              disabled={ocupado || !podeEnviar}
              onClick={() => void pedir()}
            >
              {ocupado
                ? modo === "importar"
                  ? "Separando em falas..."
                  : "Escrevendo..."
                : modo === "importar"
                  ? "Separar em falas"
                  : "Escrever roteiro"}
            </button>
          ) : (
            <button type="button" className="conteudo-confirma-sim" onClick={aceitar}>
              Adicionar ao roteiro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Previa({
  proposta,
  avisos,
  origem,
}: {
  proposta: PropostaIA;
  avisos: string[];
  origem: string;
}) {
  return (
    <div className="pn-ia-previa">
      <p className="pn-ia-ajuda">
        {proposta.falas.length}
        {proposta.falas.length === 1 ? " fala" : " falas"}, escritas por {origem}. Elas vão
        entrar <strong>no fim do roteiro</strong>, sem apagar o que já está lá.
      </p>

      {avisos.length > 0 && (
        /* Correção silenciosa é como se aprende a confiar numa saída que já
           vinha errada. Se a validação mexeu em alguma coisa, quem aprova tem
           que saber o quê. */
        <ul className="pn-ia-avisos">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <ol className="pn-ia-falas">
        {proposta.falas.map((f, i) => (
          <li key={i}>
            <div className="pn-ia-fala-topo">
              <span className="pn-ia-fala-n">{i + 1}</span>
              {f.funcao && (
                <span className="painel-badge">
                  {FUNCAO_INFO[f.funcao as FuncaoFala]?.rotulo ?? f.funcao}
                </span>
              )}
            </div>
            <p className="pn-ia-fala-texto">{f.texto}</p>
            <p className="pn-ia-fala-cena">{resumo(f)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function resumo(f: PropostaIA["falas"][number]): string {
  const partes = [f.enquadramento, f.cenario, f.acao, f.broll, f.texto_tela].filter(
    (p) => p && p.trim() !== "",
  );
  return partes.length === 0 ? "Cena não planejada" : partes.join(" · ");
}

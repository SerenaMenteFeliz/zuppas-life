import PainelTopo from "@/components/painel/PainelTopo";
import { listarCenas } from "@/lib/conteudo";
import { perfilPorId } from "@/lib/conteudo-tipos";
import {
  ATUALIZADA_EM,
  estadoDaInteligencia,
  FICHAS,
  fichaPreenchida,
  LOCAIS,
  REGRAS,
  TETO_REGRAS,
  type FichaPerfil,
} from "@/lib/ia/inteligencia";
import { temChaves } from "@/lib/ia/modelo";

/* A aba Inteligência: o que a IA sabe, à vista.

   ── É LEITURA, e isso é a decisão-âncora, não uma limitação de tempo ──

   Decidido pelo Yan em 22/08/2026: a inteligência mora no vault e a plataforma
   é o espelho. A Ge e a Liz não editam prompt nem ficha; quem edita é o Yan,
   pelo terminal, e o deploy publica.

   O motivo é concreto: instrução de IA editável por várias mãos, sem histórico,
   apodrece sem ninguém perceber. Alguém melhora uma frase, a qualidade cai três
   semanas depois, e não há de onde voltar. Com a fonte no vault e o destilado no
   git, existe histórico e existe volta.

   ── Então por que a tela existe ──

   Porque o oposto de "editável" não é "invisível". Quem usa a ferramenta
   precisa saber com base em que ela está escrevendo. Senão um roteiro
   estranho vira "a IA é ruim" em vez de "a ficha está vazia", que é a leitura
   certa hoje. Esta tela é a diferença entre as duas frases.

   Ela também é honesta sobre o que NÃO existe: campo vazio aparece como vazio,
   com o que falta pra preencher. Ver princípio 12 do vault: campo vazio pede
   que alguém preencha, campo preenchido por palpite ensina a desconfiar da
   ferramenta inteira. */

export const dynamic = "force-dynamic";

export default async function InteligenciaPage() {
  const estado = estadoDaInteligencia();
  const ligada = temChaves();
  const cenas = await listarCenas();

  return (
    <>
      <PainelTopo
        titulo="Inteligência"
        controles={
          <span className="painel-topo-nota">
            Atualizada em {ATUALIZADA_EM.split("-").reverse().join("/")}
          </span>
        }
      />

      <div className="painel-conteudo">
        <div className="glass-card mb-6 p-5">
          <p className="int-intro">
            Isto é tudo que a IA sabe quando escreve um roteiro. Ela não sabe mais nada:
            não lê o resto do painel, não lembra dos roteiros anteriores e não inventa
            informação sobre vocês.
          </p>
          <p className="int-intro">
            <strong>Não dá pra editar por aqui, e é de propósito.</strong> A fonte de tudo
            isto vive no vault da família, e chega aqui por deploy. Assim existe histórico
            de cada mudança, e dá pra voltar atrás quando uma mudança piora o resultado.
            Pra mudar qualquer coisa desta tela, fale com o Yan.
          </p>

          <div className="int-estado">
            {/* A chave vem primeiro porque ela é pré-requisito das duas
                funções: sem ela, os botões nem aparecem na tela do post, e
                este é o único lugar que explica por quê. */}
            <Selo
              pronto={ligada}
              titulo="Chave do Gemini"
              texto={
                ligada
                  ? "Configurada. As chamadas rodam pela cascata de modelos, começando pelo melhor disponível."
                  : "Faltando (GEMINI_KEYS). Enquanto isso os botões de IA não aparecem na tela do post, pra não prometer o que não cumpre."
              }
            />
            <Selo
              pronto={ligada && estado.importarPronto}
              titulo="Colar roteiro"
              texto="Não depende de nada aqui estar preenchido: ele organiza texto que já existe. Só precisa da chave."
            />
            <Selo
              pronto={ligada && estado.gerarPronto}
              titulo="Gerar roteiro"
              texto={
                estado.gerarPronto
                  ? "Ligado pros perfis com ficha preenchida."
                  : "Desligado até uma ficha de voz existir. Roteiro escrito sem ficha sai genérico, e a primeira impressão é a única que existe."
              }
            />
          </div>
        </div>

        {/* ── Fichas de voz ── */}
        <h2 className="int-secao">Quem fala</h2>
        {FICHAS.map((f) => (
          <Ficha key={f.perfilId} ficha={f} />
        ))}

        {/* ── Locais ── */}
        <h2 className="int-secao">Onde se grava</h2>
        <div className="glass-card mb-6 p-5">
          <p className="int-ajuda">
            O local do post decide que cena a IA pode propor. <strong>O que faz diferença
            não é o nome do lugar, é o que existe nele</strong>: sem isso a IA escreve
            &quot;a luz entrando pela janela da sala&quot; sem saber se existe janela ali.
            Enquanto a coluna estiver vazia, ela fica no genérico de propósito.
          </p>
          <div className="overflow-x-auto">
            <table className="painel-tabela">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>O que existe ali</th>
                  <th>Quanto custa ir</th>
                </tr>
              </thead>
              <tbody>
                {LOCAIS.map((l) => (
                  <tr key={l.id}>
                    <td>{l.rotulo}</td>
                    <td>
                      {l.recursos.length > 0 ? (
                        l.recursos.join(" · ")
                      ) : (
                        <span className="int-falta">ninguém descreveu ainda</span>
                      )}
                    </td>
                    <td>{l.esforco}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Cenas ── */}
        <h2 className="int-secao">Cenas que já funcionaram</h2>
        <div className="glass-card mb-6 p-5">
          <p className="int-ajuda">
            Esta lista <strong>não se cadastra, ela cresce sozinha</strong>: quando um post
            chega em &quot;Gravado&quot;, as cenas dele entram aqui. Cena que já foi gravada
            de verdade é a única que se sabe que funciona naquele lugar, e a IA passa a
            preferir essas.
          </p>
          {cenas.length === 0 ? (
            <p className="int-vazio">
              Vazio, e é o esperado por enquanto. A primeira cena aparece aqui quando o
              primeiro post com local escolhido for marcado como gravado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="painel-tabela">
                <thead>
                  <tr>
                    <th>Local</th>
                    <th>Cena</th>
                    <th>Enquadramento</th>
                  </tr>
                </thead>
                <tbody>
                  {cenas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.local}</td>
                      <td>{c.descricao}</td>
                      <td>{c.enquadramento ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Regras ── */}
        <h2 className="int-secao">Regras de roteiro</h2>
        <div className="glass-card mb-10 p-5">
          <p className="int-ajuda">
            Valem pra todo roteiro, de qualquer perfil. Saem do material de estudo do Yan,
            destiladas em uma linha cada: o material inteiro não entra aqui porque texto
            longo dilui a atenção do modelo, e atenção é o recurso escasso.
          </p>
          <p className="int-ajuda">
            <strong>Teto de {TETO_REGRAS} regras.</strong> Chegando lá, entrar uma exige
            cortar outra. Não é limite técnico: é o que obriga a escolher, e escolher é o
            trabalho. Instrução que só cresce piora o resultado em silêncio.
          </p>
          {REGRAS.length === 0 ? (
            <p className="int-vazio">
              Vazio. Aguardando o material de estudo do Yan. Sem regras, a IA usa só o bom
              senso geral dela sobre vídeo curto, que é melhor que regra inventada.
            </p>
          ) : (
            <ul className="int-regras">
              {REGRAS.map((r) => (
                <li key={r.texto}>
                  <span>{r.texto}</span>
                  <span className="int-fonte">
                    {r.fonte} · confiança {r.confianca}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Selo({ pronto, titulo, texto }: { pronto: boolean; titulo: string; texto: string }) {
  return (
    <div className={"int-selo" + (pronto ? " int-selo-ok" : "")}>
      <span className="int-selo-topo">
        <span className="int-selo-ponto" aria-hidden />
        {titulo}
      </span>
      <span className="int-selo-texto">{texto}</span>
    </div>
  );
}

function Ficha({ ficha }: { ficha: FichaPerfil }) {
  const perfil = perfilPorId(ficha.perfilId);
  const nome = perfil ? perfil.dono : ficha.perfilId;
  const pronta = fichaPreenchida(ficha);

  return (
    <div className="glass-card mb-6 p-5">
      <div className="int-ficha-topo">
        <h3 className="int-ficha-nome">{nome}</h3>
        <span className="painel-badge">{perfil?.rotulo ?? ficha.perfilId}</span>
        {!pronta && <span className="int-badge-falta">ficha vazia</span>}
      </div>

      {!pronta ? (
        /* Vazio explicado, não vazio mudo. Quem abre isto precisa entender que
           não é bug nem esquecimento, e o que exatamente destrava. */
        <div className="int-vazio-bloco">
          <p>
            Ninguém preencheu como {nome} escreve, e por isso <strong>Gerar roteiro está
            desligado</strong> pra este perfil. Colar roteiro continua funcionando normal.
          </p>
          <p>
            Isto <strong>não se preenche por dedução</strong>. Ficha escrita no palpite vira
            instrução com cara de fato e passa a moldar todo roteiro futuro sem ninguém
            conferir. O que preenche é material real:
          </p>
          <ul>
            <li>A transcrição dos vídeos que já foram publicados.</li>
            <li>
              O número de cada um. <strong>&quot;Deu certo&quot; tem que ser o número, não
              a lembrança</strong>, senão a ficha aprende o viés de quem lembrou.
            </li>
            <li>
              Alguns que <strong>fracassaram</strong> também. Só de acertos não dá pra
              separar o que causou o acerto do que é só o jeito dela.
            </li>
          </ul>
        </div>
      ) : (
        <dl className="int-ficha">
          <Linha rotulo="Público" valor={ficha.publico} />
          <Linha rotulo="A dor" valor={ficha.dor} />
          <Linha rotulo="Tom" valor={ficha.tom} />
          <Linha rotulo="Ganchos" valor={ficha.ganchos} />
          <Linha rotulo="Duração alvo" valor={ficha.duracaoAlvo} />
          <Lista rotulo="Palavras dela" itens={ficha.vocabulario} />
          <Lista rotulo="Nunca dizer" itens={ficha.naoDizer} />
          <Lista rotulo="O que ela faz hoje" itens={ficha.observado} />
          <Lista rotulo="Para onde quer levar" itens={ficha.diretriz} />
          <Lista
            rotulo="Falas de referência"
            itens={ficha.exemplos.map((e) => '"' + e.fala + '" (' + e.porque + ')')}
          />
          <Linha rotulo="De onde isto saiu" valor={ficha.procedencia ?? ""} />
        </dl>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt>{rotulo}</dt>
      <dd>{valor.trim() !== "" ? valor : <span className="int-falta">vazio</span>}</dd>
    </>
  );
}

function Lista({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  return (
    <>
      <dt>{rotulo}</dt>
      <dd>
        {itens.length === 0 ? (
          <span className="int-falta">vazio</span>
        ) : (
          <ul className="int-lista">
            {itens.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </dd>
    </>
  );
}

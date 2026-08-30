import BotaoCriar from "@/components/painel/BotaoCriar";
import BuscaConteudo from "@/components/painel/BuscaConteudo";
import ConteudoQuadro from "@/components/painel/ConteudoQuadro";
import ConteudoCalendario from "@/components/painel/ConteudoCalendario";
import ConteudoLista, {
  type Direcao,
  type FiltroColuna,
  type Ordem,
  type Paginacao,
} from "@/components/painel/ConteudoLista";
import FiltroPerfil from "@/components/painel/FiltroPerfil";
import LinkVisao from "@/components/painel/LinkVisao";
import PainelTopo from "@/components/painel/PainelTopo";
import { contarFalas, listarPosts } from "@/lib/conteudo";
import { mesValido, semanaValida } from "@/lib/conteudo-calendario";
import {
  FORMATOS,
  PERFIS,
  PILARES,
  STATUS,
  STATUS_INFO,
  STATUS_QUADRO,
  dataDoPost,
  perfilPorId,
  tituloDe,
  type PostResumo,
  type Status,
} from "@/lib/conteudo-tipos";
import { hojeISO } from "@/lib/datas";
import { criarPostAcao } from "./acoes";

/* Painel de Conteúdo (11/08/2026), a metade esquerda do funil.

   O /painel/funis só enxerga a partir de "visitou o quiz": tudo que acontece
   antes (que post levou a pessoa até a bio) era cego. Esta seção é onde o
   conteúdo que gera esse tráfego passa a ter registro.

   Três visões sobre a MESMA lista, porque são três perguntas diferentes:
   quadro = "onde travou", calendário = "o que sai quando", lista = "compara".
   A visão vive na URL e não em estado de cliente, pra ser compartilhável e
   pro botão voltar funcionar. */

export const dynamic = "force-dynamic";

type Busca = {
  v?: string;
  perfil?: string;
  mes?: string;
  semana?: string;
  janela?: string;
  ord?: string;
  /** Termo de busca por título. */
  q?: string;
  /** Página da Lista. */
  pag?: string;
  /** Página do card "sem data marcada" do calendário. */
  sd?: string;
  /** Coluna do quadro que está mostrando todos os cards. */
  col?: string;
  /** Direção da ordenação da Lista: `asc` ou `desc`. */
  dir?: string;
  /* Filtros por coluna da Lista. `perfil` já existia como filtro da faixa de
     topo e continua sendo o mesmo parâmetro: dois lugares mexendo no mesmo
     recorte, e não dois recortes concorrentes. */
  formato?: string;
  pilar?: string;
  status?: string;
};

/** Linhas por página na Lista.

    25 porque é o que cabe numa tela de notebook sem rolar até o fim, e porque a
    Lista existe pra comparar: página que exige rolagem longa já perdeu a
    comparação que ela promete. */
const POR_PAGINA = 25;

/** Itens por página no card de "sem data marcada".

    Era 8 quando cada item ocupava uma linha inteira. Com a grade `auto-fill`
    (30/08) eles entram lado a lado, 4 ou 5 por linha num monitor, então 24
    cabem em 5 linhas sem o card virar a peça principal da tela. O ganho é o
    calendário passar a mostrar o backlog inteiro numa página só enquanto ele
    for pequeno, e a paginação só aparecer quando de fato acumular. */
const SEM_DATA_POR_PAGINA = 24;

const VISOES = [
  { id: "quadro", rotulo: "Quadro" },
  { id: "calendario", rotulo: "Calendário" },
  { id: "lista", rotulo: "Lista" },
];

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const busca = await searchParams;
  const visao = VISOES.some((v) => v.id === busca.v) ? busca.v! : "quadro";
  const perfilFiltro = PERFIS.some((p) => p.id === busca.perfil) ? busca.perfil : undefined;

  const termo = (busca.q ?? "").trim();
  const direcao: Direcao = busca.dir === "asc" ? "asc" : "desc";
  /* Sem `ord` na URL a lista fica no padrão (data, mais recente primeiro) e
     NENHUMA coluna aparece ordenada. É o terceiro estado do cabeçalho, e ele
     precisa existir: sem ele não há como desfazer uma ordenação a não ser
     adivinhando qual era a de fábrica. */
  const ordenacaoAtiva = ORDENS.includes(busca.ord as Ordem) ? (busca.ord as Ordem) : null;

  const filtroFormato = FORMATOS.includes(busca.formato as (typeof FORMATOS)[number])
    ? busca.formato
    : undefined;
  const filtroPilar = PILARES.includes(busca.pilar as (typeof PILARES)[number])
    ? busca.pilar
    : undefined;
  const filtroStatus = STATUS.includes(busca.status as Status) ? busca.status : undefined;

  const [todos, contagens] = await Promise.all([listarPosts(), contarFalas()]);

  /* Perfil e busca são o MESMO tipo de coisa (recorte da lista) e por isso
     valem nas três visões, não só na Lista. Buscar no quadro e ver as colunas
     encolherem é o que responde "em que etapa está aquele post que eu lembro
     pelo nome", que é uma pergunta real. O campo fica sempre visível no topo,
     então nunca há filtro escondido agindo. */
  const filtrados = todos.filter((p) => {
    if (perfilFiltro && p.perfil !== perfilFiltro) return false;
    if (filtroFormato && p.formato !== filtroFormato) return false;
    if (filtroPilar && p.pilar !== filtroPilar) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (termo && !casa(tituloDe(p), termo)) return false;
    return true;
  });

  /* Ordenar só faz sentido na Lista, que é a visão de comparar. O quadro ordena
     por status e o calendário por data, por definição — reordenar ali seria
     ignorado e a URL mentiria sobre o que está vendo. */
  const posts =
    visao === "lista" ? ordenar(filtrados, contagens, ordenacaoAtiva, direcao) : filtrados;

  /* Quem vai ser o dono do post novo.

     Com filtro ativo, é ele, e o botão diz. Sem filtro, o botão não promete
     nada e o perfil se escolhe na tela do post.

     A coluna é `not null` no banco, então a linha precisa nascer com ALGUM
     valor mesmo sem escolha. Continua sendo a Ge, que é quem produz o conteúdo
     hoje: trocar pro primeiro da lista faria a Ge corrigir o campo em todo post
     que criasse. A diferença pra antes é que o botão parou de afirmar um dono
     que ninguém escolheu. */
  const perfilDoNovo = perfilFiltro ?? "geovana";
  const donoDoNovo = perfilFiltro ? (perfilPorId(perfilFiltro)?.dono ?? perfilFiltro) : null;

  const hoje = hojeISO();
  const mes = mesValido(busca.mes, hoje);
  const semana = semanaValida(busca.semana, hoje);
  /* Mês é o padrão: quem abre o calendário quase sempre quer a visão larga
     primeiro, e a semana é o zoom que se pede. */
  const janela = busca.janela === "semana" ? "semana" : "mes";

  /* `undefined` numa chave da mudança APAGA o parâmetro (é o que o filtro de
     "todos os perfis" usa). Por isso o objeto é montado com spread e a leitura
     é sempre do resultado, nunca de `busca` direto. */
  const link = (mudanca: Partial<Busca>) => {
    const atual: Busca = {
      v: visao,
      perfil: perfilFiltro,
      mes: busca.mes,
      semana: busca.semana,
      janela: busca.janela,
      ord: busca.ord,
      q: termo || undefined,
      dir: busca.dir,
      formato: busca.formato,
      pilar: busca.pilar,
      status: busca.status,
      pag: busca.pag,
      sd: busca.sd,
      col: busca.col,
      ...mudanca,
    };
    /* Trocar de ordem, de perfil ou de busca volta pra primeira página: a
       página 3 de uma lista é a página 3 DAQUELA lista, e mantê-la depois de
       reordenar cai num pedaço aleatório do meio. Mesma coisa pro card de sem
       data quando o recorte muda. */
    if (
      "ord" in mudanca ||
      "perfil" in mudanca ||
      "q" in mudanca ||
      "formato" in mudanca ||
      "pilar" in mudanca ||
      "status" in mudanca
    ) {
      atual.pag = undefined;
      atual.sd = undefined;
    }
    const qs = new URLSearchParams();
    if (atual.v) qs.set("v", atual.v);
    if (atual.perfil) qs.set("perfil", atual.perfil);
    if (atual.mes) qs.set("mes", atual.mes);
    if (atual.semana) qs.set("semana", atual.semana);
    if (atual.janela) qs.set("janela", atual.janela);
    if (atual.ord) qs.set("ord", atual.ord);
    /* Direção só faz sentido junto de uma coluna ordenada; sozinha na URL ela
       seria estado morto. */
    if (atual.ord && atual.dir) qs.set("dir", atual.dir);
    if (atual.q) qs.set("q", atual.q);
    if (atual.formato) qs.set("formato", atual.formato);
    if (atual.pilar) qs.set("pilar", atual.pilar);
    if (atual.status) qs.set("status", atual.status);
    if (atual.pag) qs.set("pag", atual.pag);
    if (atual.sd) qs.set("sd", atual.sd);
    if (atual.col) qs.set("col", atual.col);
    return "/painel/conteudo?" + qs.toString();
  };

  /* ── Lista: a página que está na tela ─────────────────────────────────────
     A fatia é feita AQUI, no servidor, e só ela atravessa pro componente de
     cliente: 25 linhas viram 25 linhas de HTML, não 250. */
  const pagina = paginaValida(busca.pag, posts.length, POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const daPagina = posts.slice(inicio, inicio + POR_PAGINA);
  const paginacao: Paginacao = {
    pagina,
    paginas: Math.max(1, Math.ceil(posts.length / POR_PAGINA)),
    primeiro: posts.length === 0 ? 0 : inicio + 1,
    ultimo: Math.min(inicio + POR_PAGINA, posts.length),
    total: posts.length,
    anterior: pagina > 1 ? link({ pag: String(pagina - 1) }) : undefined,
    proxima: inicio + POR_PAGINA < posts.length ? link({ pag: String(pagina + 1) }) : undefined,
  };

  /* ── Calendário: os sem data, do mais velho pro mais novo ─────────────────
     A ordem é o ponto, não a paginação: o card existe pra mostrar o que está
     parado, e parado só significa alguma coisa com idade à vista. */
  const semDataTodos = [...filtrados]
    .filter((p) => !dataDoPost(p))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const paginaSemData = paginaValida(busca.sd, semDataTodos.length, SEM_DATA_POR_PAGINA);
  const inicioSemData = (paginaSemData - 1) * SEM_DATA_POR_PAGINA;
  const semDataPaginacao: Paginacao = {
    pagina: paginaSemData,
    paginas: Math.max(1, Math.ceil(semDataTodos.length / SEM_DATA_POR_PAGINA)),
    primeiro: semDataTodos.length === 0 ? 0 : inicioSemData + 1,
    ultimo: Math.min(inicioSemData + SEM_DATA_POR_PAGINA, semDataTodos.length),
    total: semDataTodos.length,
    anterior: paginaSemData > 1 ? link({ sd: String(paginaSemData - 1) }) : undefined,
    proxima:
      inicioSemData + SEM_DATA_POR_PAGINA < semDataTodos.length
        ? link({ sd: String(paginaSemData + 1) })
        : undefined,
  };

  /* O recorte atual, pendurado no link de cada post: é o que faz o "‹ Conteúdo"
     da tela do post devolver a lista como ela estava (ver `DA_LISTA` lá).
     `link({})` já sabe montar a URL do estado corrente; aqui fica só a parte da
     query. */
  const sufixo = (() => {
    const q = link({}).split("?")[1] ?? "";
    return q ? "?" + q : "";
  })();

  /* Quadro: qual coluna está aberta, e o link pra abrir cada uma. */
  const colunaAberta = STATUS_QUADRO.includes(busca.col as Status) ? busca.col : undefined;
  const linksExpandir = Object.fromEntries(
    STATUS_QUADRO.map((s) => [s, link({ col: s })]),
  ) as Record<string, string>;

  /* Um href por coluna, montado aqui. Ver o comentário no ConteudoLista sobre
     por que não vai a função.

     E montado DEPOIS de `link`, não antes: `const` não sobe como `function`,
     então chamar `link()` acima da declaração dele derruba a rota inteira com
     "Cannot access 'link' before initialization". Foi o que aconteceu na
     primeira versão disto, em 22/08/2026. */
  /* Cada cabeçalho aponta pro PRÓXIMO estado dele, e o ciclo é
     nenhum → crescente → decrescente → nenhum.

     Voltar ao "nenhum" é o que devolve a lista ao padrão sem exigir que a
     pessoa lembre qual era. Clicar numa coluna diferente começa o ciclo dela do
     início, e não herda a direção da anterior: "crescente" em Título e em Data
     querem dizer coisas diferentes, e herdar faria a lista mudar duas vezes num
     clique só. */
  const linksDeOrdem = Object.fromEntries(
    ORDENS.map((o) => {
      if (ordenacaoAtiva !== o) return [o, link({ ord: o, dir: "asc" })];
      if (direcao === "asc") return [o, link({ ord: o, dir: "desc" })];
      return [o, link({ ord: undefined, dir: undefined })];
    }),
  ) as Record<Ordem, string>;

  /* Filtros por coluna. Só as colunas de vocabulário fechado entram: Título tem
     a busca da faixa de topo, e Data e Roteiro são contínuos, onde uma lista de
     valores não ajudaria (o filtro útil ali seria faixa, que é outra peça). */
  const filtrosDeColuna: Partial<Record<Ordem, FiltroColuna>> = {
    perfil: {
      ativo: perfilFiltro,
      opcoes: [
        { valor: "", rotulo: "Todos os perfis", href: link({ perfil: undefined }) },
        ...PERFIS.map((x) => ({
          valor: x.id,
          rotulo: x.dono,
          cor: x.cor,
          href: link({ perfil: x.id }),
        })),
      ],
    },
    formato: {
      ativo: filtroFormato,
      opcoes: [
        { valor: "", rotulo: "Todos os formatos", href: link({ formato: undefined }) },
        ...FORMATOS.map((f) => ({ valor: f, rotulo: f, href: link({ formato: f }) })),
      ],
    },
    pilar: {
      ativo: filtroPilar,
      opcoes: [
        { valor: "", rotulo: "Todos os pilares", href: link({ pilar: undefined }) },
        ...PILARES.map((f) => ({ valor: f, rotulo: f, href: link({ pilar: f }) })),
      ],
    },
    status: {
      ativo: filtroStatus,
      opcoes: [
        { valor: "", rotulo: "Todos os status", href: link({ status: undefined }) },
        ...STATUS.map((x) => ({
          valor: x,
          rotulo: STATUS_INFO[x].rotulo,
          cor: STATUS_INFO[x].cor,
          href: link({ status: x }),
        })),
      ],
    },
  };

  return (
    <>
      {/* Rótulo, controles e ação numa faixa fixa só (22/08/2026). Antes eram
          duas linhas roláveis: um letreiro de 3rem repetindo o que a sidebar já
          diz, e embaixo os controles, que sumiam justamente quando a lista
          ficava longa o bastante pra alguém querer trocar de visão.

          A visão continua em botões colados e não em dropdown (decidido com o
          Yan em 21/08): são três opções e são a navegação principal da tela,
          então valem os três à vista e a troca em um clique. O dropdown ficou
          pro perfil, que tem mais opções e é filtro secundário. */}
      <PainelTopo
        titulo="Conteúdo"
        controles={
          <>
            <nav className="conteudo-visoes">
              {VISOES.map((v) => (
                <LinkVisao
                  key={v.id}
                  href={link({ v: v.id })}
                  ativo={v.id === visao}
                  className={"conteudo-visao" + (v.id === visao ? " conteudo-visao-ativa" : "")}
                >
                  {v.rotulo}
                </LinkVisao>
              ))}
            </nav>

            <FiltroPerfil
              valor={perfilFiltro}
              opcoes={[
                { id: "", rotulo: "Todos os perfis", href: link({ perfil: undefined }) },
                ...PERFIS.map((p) => ({
                  id: p.id,
                  rotulo: p.rotulo,
                  href: link({ perfil: p.id }),
                  cor: p.cor,
                })),
              ]}
            />

            <BuscaConteudo
              termo={termo || undefined}
              preservar={{
                v: visao,
                perfil: perfilFiltro,
                mes: busca.mes,
                semana: busca.semana,
                janela: busca.janela,
                ord: busca.ord,
              }}
              hrefLimpar={link({ q: undefined })}
            />
          </>
        }
        acoes={
          /* Um clique e nada mais. O post nasce sem título e a tela seguinte
             abre com o campo focado. */
          <form action={criarPostAcao}>
            <input type="hidden" name="perfil" value={perfilDoNovo} />
            <BotaoCriar dono={donoDoNovo} />
          </form>
        }
      />

      <div className="painel-conteudo">
        {/* O quadro continua aparecendo com zero post (22/08/2026). Antes, uma
            base vazia trocava tudo por uma frase, e quem abria pela primeira
            vez não descobria que existe uma esteira — Ideia, Roteiro, Gravado,
            Agendado, Postado. As colunas vazias ensinam o fluxo de graça; a
            frase sozinha não ensinava nada. */}
        {todos.length === 0 && (
          <p className="conteudo-primeiro-passo">
            Nada aqui ainda. Cada post começa como <strong>Ideia</strong> e anda pelas colunas
            até virar <strong>Postado</strong>. Aperte <strong>Criar</strong> ali em cima: o post
            nasce vazio e você escreve o nome na tela seguinte.
          </p>
        )}

        {/* Buscou e não sobrou nada: o quadro e o calendário ficariam vazios
            sem explicar por quê, e "vazio" ali lê como "não tem trabalho", não
            como "sua busca não achou". A Lista diz isso sozinha, na própria
            tabela.

            A visão sai do ar junto (30/08/2026): cinco colunas dizendo "Nada
            aqui" embaixo de "nenhum post encontrado" é a mesma informação três
            vezes, e o quadro tem altura fixa, então ele empurraria a mensagem
            pra fora e devolveria rolagem à página. */}
        {termo && filtrados.length === 0 && visao !== "lista" ? (
          <p className="conteudo-primeiro-passo">
            Nenhum post com <strong>{termo}</strong> no título.{" "}
            <a href={link({ q: undefined })} className="conteudo-ordenar">
              Limpar a busca
            </a>
          </p>
        ) : visao === "quadro" ? (
          <ConteudoQuadro
            posts={posts}
            contagens={Object.fromEntries(contagens)}
            sufixo={sufixo}
            expandida={colunaAberta}
            linksExpandir={linksExpandir}
            linkRecolher={link({ col: undefined })}
          />
        ) : visao === "calendario" ? (
          <ConteudoCalendario
            mes={mes}
            semana={semana}
            janela={janela}
            posts={posts}
            semData={semDataTodos.slice(inicioSemData, inicioSemData + SEM_DATA_POR_PAGINA)}
            semDataPaginacao={semDataPaginacao}
            sufixo={sufixo}
            hoje={hoje}
            perfilFiltro={perfilFiltro}
          />
        ) : (
          <ConteudoLista
            posts={daPagina}
            contagens={Object.fromEntries(contagens)}
            ordem={ordenacaoAtiva}
            direcao={direcao}
            filtros={filtrosDeColuna}
            links={linksDeOrdem}
            paginacao={paginacao}
            sufixo={sufixo}
            termo={termo || undefined}
          />
        )}
      </div>
    </>
  );
}

const ORDENS: Ordem[] = ["titulo", "perfil", "formato", "pilar", "status", "data", "roteiro"];

/** Página pedida na URL, presa dentro do que existe.

    Presa e não rejeitada: `?pag=99` numa lista de 3 páginas mostra a 3, não uma
    tela vazia. URL de página envelhece sozinha (alguém apaga posts, alguém
    filtra) e tela vazia por número velho parece defeito. */
function paginaValida(bruto: string | undefined, total: number, porPagina: number): number {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, paginas);
}

/** Comparação de busca: sem caixa e sem acento.

    Sem acento porque ninguém digita "gratidão" com til na pressa, e uma busca
    que exige o acento certo é uma busca que falha calada. `NFD` separa a letra
    do acento e o `replace` tira só os acentos, preservando o resto. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function casa(titulo: string, termo: string): boolean {
  return normalizar(titulo).includes(normalizar(termo));
}

/* Ordenação da Lista.

   Sem coluna escolhida, o padrão: data, mais recente primeiro. É a ordem em que
   a lista abre e a que ela volta quando alguém desfaz a ordenação.

   Campo vazio vai SEMPRE pro fim, nas duas direções. Sem isso, ordenar por
   "pilar" em crescente encabeçaria a lista com tudo que ninguém classificou,
   que é o oposto de comparar: o que interessa numa comparação é o que está
   preenchido. Inverter a direção não pode trazer o vazio pra cima, porque
   "vazio" não é um valor menor, é ausência de valor.

   `localeCompare` com locale pt-BR porque "Ação" e "Agendado" precisam sair na
   ordem que uma pessoa espera, e a comparação binária de string põe qualquer
   acento depois do Z. */
function ordenar(
  posts: PostResumo[],
  contagens: Map<string, { total: number; gravadas: number }>,
  ordem: Ordem | null,
  direcao: Direcao,
): PostResumo[] {
  const coluna = ordem ?? "data";
  /* O padrão é decrescente por data. Quando não há coluna escolhida, a direção
     da URL não vale: ela descreve uma ordenação que não está acontecendo. */
  const desc = ordem === null ? true : direcao === "desc";

  const texto = (p: PostResumo): string => {
    if (coluna === "titulo") return p.titulo?.trim() ?? "";
    if (coluna === "perfil") return perfilPorId(p.perfil)?.dono ?? p.perfil;
    if (coluna === "formato") return p.formato ?? "";
    if (coluna === "pilar") return p.pilar ?? "";
    if (coluna === "status") return STATUS_INFO[p.status as Status]?.rotulo ?? p.status;
    if (coluna === "data") return dataDoPost(p) ?? "";
    return "";
  };

  return [...posts].sort((a, b) => {
    if (coluna === "roteiro") {
      /* Roteiro ordena por QUANTO FALTA gravar, não pelo total: a pergunta que
         a coluna responde é "o que está mais perto de sair". Post sem roteiro
         nenhum não tem resposta e vai pro fim nas duas direções. */
      const ca = contagens.get(a.id);
      const cb = contagens.get(b.id);
      if (!ca && !cb) return 0;
      if (!ca) return 1;
      if (!cb) return -1;
      const dif = ca.gravadas / ca.total - cb.gravadas / cb.total;
      return desc ? -dif : dif;
    }

    const ta = texto(a);
    const tb = texto(b);
    if (ta === "" && tb === "") return 0;
    if (ta === "") return 1;
    if (tb === "") return -1;
    const dif = ta.localeCompare(tb, "pt-BR");
    return desc ? -dif : dif;
  });
}

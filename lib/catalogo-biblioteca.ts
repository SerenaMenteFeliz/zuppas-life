/* Espelho MÍNIMO do catálogo da Biblioteca Oculta (slug, título real, capa),
   pra que o painel mostre capa e título de verdade em vez de um título
   derivado do slug (que perde acento e pontuação: "nao-me-larga" virava "Nao
   Me Larga", sem o "ã" e sem o "?" de "Tem Outra?").

   Copiado à mão de `biblioteca-oculta/lib/livros.js` em 28/08/2026. Fonte
   única de verdade continua sendo aquele arquivo — slug nunca se renomeia lá
   (quebraria link em bio já publicada), então este espelho só fica
   desatualizado se um livro NOVO entrar no catálogo sem ninguém lembrar de
   também copiar a linha aqui. Repo diferente, sem import direto: os dois
   projetos não compartilham dependência nenhuma hoje. */

export type LivroBiblioteca = { slug: string; titulo: string; capaUrl: string | null };

const BASE_CAPAS = "https://bibliotecaoculta.serenamentefeliz.com/assets/capas";

const CATALOGO: Record<string, string> = {
  // A VOLTA
  "ele-sumiu": "Ele Sumiu",
  "a-outra": "A Outra",
  "bloqueada": "Bloqueada",
  "enrolacao": "Enrolação",
  "ultima-briga": "A Última Briga",
  "anos-depois": "Anos Depois",
  // AMOR & ATRAÇÃO
  "alma-gemea": "Alma Gêmea",
  "so-na-cama": "Só na Cama",
  "ele-esfriou": "Ele Esfriou",
  "ele-nao-me-ve": "Ele Não Me Vê",
  "nao-consigo-largar": "Não Consigo Largar",
  "ele-e-dela": "Ele É Dela",
  "sozinha-faz-tempo": "Sozinha Faz Tempo",
  "irresistivel": "Irresistível",
  // PROTEÇÃO
  "olho-gordo": "Olho Gordo",
  "fizeram-por-mal": "Fizeram Por Mal",
  "a-rival": "A Rival",
  "gente-que-suga": "Gente Que Suga",
  "casa-selada": "Casa Selada",
  // PROSPERIDADE
  "nome-sujo": "Nome Sujo",
  "sem-emprego": "Sem Emprego",
  "o-ralo": "O Ralo",
  "loja-vazia": "Loja Vazia",
  "passam-por-cima": "Passam Por Cima",
  // JUSTIÇA
  "tem-outra": "Tem Outra?",
  "me-trairam": "Me Traíram",
  "nao-me-larga": "Não Me Larga",
  "falam-de-mim": "Falam de Mim",
  "causa-ganha": "Causa Ganha",
  "me-devem": "Me Devem",
};

/* O EXTRA do checkout. Ele TEM capa desde 28/08/2026.
   Havia aqui um `SEM_CAPA = new Set(["luas-e-dias"])`, escrito na manhã em que
   este arquivo nasceu, quando o extra era o único item sem arte. A capa dele
   ficou pronta poucas horas depois, no MESMO dia, e este espelho não soube: o
   Yan viu o buraco no painel em 29/08.
   É o modo de falhar de todo espelho manual, e foi o que motivou a busca ao vivo
   logo abaixo. */
CATALOGO["luas-e-dias"] = "Luas e Dias";

/** Slug fora do espelho (livro novo ainda não copiado pra cá) cai num título
    legível, na marra, em vez de quebrar a tela. */
function tituloDeReserva(slug: string) {
  const miudas = new Set(["de", "da", "do", "e", "na", "no", "por", "pra", "com", "que", "me"]);
  return slug
    .split("-")
    .map((p, i) => (i > 0 && miudas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** A tabela local, que agora é RESERVA e não mais a fonte. Ver `carregarCatalogo`. */
export function livroBiblioteca(slug: string): LivroBiblioteca {
  const titulo = CATALOGO[slug] ?? tituloDeReserva(slug);
  const capaUrl = slug in CATALOGO ? `${BASE_CAPAS}/${slug}.webp` : null;
  return { slug, titulo, capaUrl };
}

/* ═══════════════════════════════════════════════════════════════════════════
   O CATÁLOGO AO VIVO (29/08/2026), que substitui o espelho acima como fonte.

   POR QUE MUDOU: o espelho de cima quebrou no mesmo dia em que nasceu. Ele foi
   escrito em 28/08 marcando `luas-e-dias` como "sem capa", porque naquela hora
   o extra não tinha arte; a capa ficou pronta poucas horas depois e ninguém
   voltou aqui. Espelho manual não avisa quando envelhece, e quem edita o
   original não tem motivo pra lembrar de uma cópia que mora em outro repo.

   Agora `biblioteca-oculta` serve `/api/catalogo`, lido direto de
   `lib/livros.js`, que é a fonte única de verdade de lá. Livro novo, preço novo
   ou capa nova aparecem aqui sem ninguém copiar nada.

   A TABELA LOCAL CONTINUA, como RESERVA. Se a Biblioteca estiver fora do ar ou
   a rota mudar, o painel mostra título e capa do espelho em vez de quebrar. Ela
   pode ficar velha, e tudo bem: ela só entra em cena quando a alternativa é não
   ter nada. O que não pode é ela voltar a ser a fonte em silêncio, e é por isso
   que a falha é registrada no log do servidor.

   `revalidate: 3600` porque catálogo muda quando um livro entra, o que é raro.
   ═══════════════════════════════════════════════════════════════════════════ */

const URL_CATALOGO = "https://bibliotecaoculta.serenamentefeliz.com/api/catalogo/";

type LivroDaApi = { slug: string; titulo: string; capaUrl: string | null };

/**
 * Devolve uma função de busca por slug, já com o catálogo carregado.
 *
 * Devolve função em vez de mapa pra que o chamador não precise tratar slug
 * ausente: livro fora do catálogo cai na reserva do mesmo jeito que antes.
 */
export async function carregarCatalogo(): Promise<(slug: string) => LivroBiblioteca> {
  let porSlug: Map<string, LivroDaApi> | null = null;

  try {
    const r = await fetch(URL_CATALOGO, { next: { revalidate: 3600 } });
    if (r.ok) {
      const dados = await r.json();
      if (Array.isArray(dados?.livros)) {
        porSlug = new Map(dados.livros.map((l: LivroDaApi) => [l.slug, l]));
      }
    } else {
      console.warn(`catálogo da Biblioteca respondeu ${r.status}; usando a reserva local`);
    }
  } catch (e) {
    console.warn("catálogo da Biblioteca inacessível; usando a reserva local", e);
  }

  return (slug: string): LivroBiblioteca => {
    const vivo = porSlug?.get(slug);
    if (vivo) return { slug, titulo: vivo.titulo, capaUrl: vivo.capaUrl };
    return livroBiblioteca(slug);
  };
}

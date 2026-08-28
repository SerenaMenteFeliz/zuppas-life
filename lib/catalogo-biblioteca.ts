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

// EXTRA do checkout (order bump): sem capa própria, cai no gradiente de espera.
const SEM_CAPA = new Set(["luas-e-dias"]);
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

export function livroBiblioteca(slug: string): LivroBiblioteca {
  const titulo = CATALOGO[slug] ?? tituloDeReserva(slug);
  const capaUrl = SEM_CAPA.has(slug) || !(slug in CATALOGO) ? null : `${BASE_CAPAS}/${slug}.webp`;
  return { slug, titulo, capaUrl };
}

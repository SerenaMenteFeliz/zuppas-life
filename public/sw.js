/* Service worker do Zuppas Life.

   Duas razões pra existir, nesta ordem:

   1. **Funcionar sem internet.** Ubatuba não tem sinal confiável em toda casa,
      e um painel de rotina que mostra tela de erro às 7h da manhã perde a
      família na primeira semana. Como o estado vive no aparelho (localStorage),
      offline aqui não é degradação: é o app inteiro funcionando.
   2. **Destravar a instalação.** O navegador só oferece "adicionar à tela de
      início" quando existe manifesto válido **e** service worker com handler de
      fetch. Sem instalação não há notificação em iPhone, que é a fase 5.

   Estratégia por tipo de pedido:

   - **Navegação**: rede primeiro, cache como rede de segurança. Assim uma
     versão nova chega assim que existe, e a falta de sinal cai no que já foi
     visto em vez de na tela de dinossauro.
   - **Estático** (`/_next/static`, ícones): cache primeiro. Esses arquivos têm
     hash no nome, então nunca mudam de conteúdo sem mudar de endereço.

   Sem cache de API porque ainda não existe API. Quando o Supabase entrar, este
   arquivo é o lugar de decidir o que vale guardar. */

const VERSAO = "zuppas-life-v1";
const ESSENCIAIS = ["/", "/semana", "/casa", "/akiane"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(ESSENCIAIS))
      /* Falhar em pré-carregar não pode impedir a instalação: melhor um service
         worker ativo com cache vazio do que nenhum. */
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;

  /* Só GET. POST e afins nunca devem sair do cache. */
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(() =>
          caches.match(pedido).then((cacheado) => cacheado || caches.match("/"))
        )
    );
    return;
  }

  const estatico =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icone-") ||
    url.pathname.endsWith(".svg");

  if (!estatico) return;

  evento.respondWith(
    caches.match(pedido).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(pedido).then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
        return resposta;
      });
    })
  );
});

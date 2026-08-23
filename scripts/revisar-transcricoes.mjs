/* Junta os .roteiro.json de uma pasta num markdown pra conferir contra os
   vídeos.

   Uso:
     node scripts/revisar-transcricoes.mjs "C:\pasta\com\os\videos"

   Existe porque revisar JSON cru não acontece: o formato é hostil o bastante
   pra que a conferência seja pulada, e a conferência é o único passo que
   separa "material da Ge" de "material do Gemini" antes de isso virar a ficha
   que molda todo roteiro futuro.

   Não chama IA e não escreve no banco. Só lê os JSON e escreve um .md. */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pasta = process.argv[2];
if (!pasta) {
  console.error('Falta a pasta.\n\n  node scripts/revisar-transcricoes.mjs "C:\\pasta"\n');
  process.exit(1);
}

const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith(".roteiro.json"))
  .sort();

if (arquivos.length === 0) {
  console.error("Nenhum .roteiro.json em " + pasta);
  process.exit(1);
}

const L = [];
L.push("# Revisão das transcrições");
L.push("");
L.push("Gerado em " + new Date().toISOString().slice(0, 10) + " a partir de " + arquivos.length + " arquivo(s).");
L.push("");
L.push("> **O que conferir, em ordem de quanto custa errar:**");
L.push(">");
L.push("> 1. **As palavras são dela?** Modelo de linguagem corrige gramática por reflexo. Se o texto");
L.push(">    parecer mais bem escrito que a fala dela, a ficha vai aprender a voz errada e o erro");
L.push(">    sai bonito, ninguém desconfia depois.");
L.push("> 2. **Alguma cena foi inventada?** Cena que entra no catálogo vira exemplo de \"isso funciona\"");
L.push(">    nas gerações seguintes.");
L.push("> 3. **A origem da imagem está certa?** `gravada` alimenta o catálogo, `banco` não.");
L.push("> 4. **A função de cada fala faz sentido?** É o que ensina a estrutura de roteiro dela.");
L.push("");

for (const nome of arquivos) {
  const d = JSON.parse(readFileSync(join(pasta, nome), "utf8"));
  const r = d.roteiro ?? {};
  const falas = r.falas ?? [];

  L.push("---");
  L.push("");
  L.push("## " + (d.arquivo ?? nome));
  L.push("");
  L.push("| | |");
  L.push("|---|---|");
  L.push("| Título | " + (r.titulo ?? "") + " |");
  L.push("| Pilar | " + (r.pilar ?? "") + " |");
  L.push("| Voz | " + (r.voz ?? "") + " |");
  L.push("| Pessoa na câmera | " + (r.pessoa_na_camera ?? "") + " |");
  L.push("| Origem da imagem | **" + (r.origem_imagem ?? "") + "**" + (r.origem_imagem === "gravada" ? " (entra no catálogo se você confirmar)" : "") + " |");
  L.push("| Local | " + (r.local_observado || "(vazio)") + " |");
  L.push("| Legenda queimada | " + (r.legenda_queimada ?? "") + " |");
  L.push("| Duração declarada | " + (r.duracao_segundos ?? "?") + "s |");
  L.push("| Modelo / tokens | " + (d.modelo ?? "?") + " · " + (d.tokens?.entrada ?? "?") + " entrada / " + (d.tokens?.saida ?? "?") + " saída |");
  L.push("");

  const repetidas = falas.filter((f, i) => i > 0 && f.texto.trim() === falas[i - 1].texto.trim()).length;
  if (repetidas > 0) {
    L.push("> ⚠ " + repetidas + " fala(s) repetem o texto da anterior: provavelmente um texto só segurado enquanto a imagem troca.");
    L.push("");
  }

  L.push("### Falas (" + falas.length + ")");
  L.push("");
  for (const [i, f] of falas.entries()) {
    L.push("**" + (i + 1) + ". [" + (f.funcao || "?") + "]** " + f.texto);
    const cena = [f.enquadramento, f.cenario, f.acao].filter((x) => x && x.trim()).join(" · ");
    if (cena) L.push("   `cena:` " + cena);
    if (f.texto_tela && f.texto_tela.trim()) L.push("   `tela:` " + f.texto_tela);
    if (f.broll && f.broll.trim()) L.push("   `broll:` " + f.broll);
    if (f.observacao && f.observacao.trim()) L.push("   `obs:` " + f.observacao);
    L.push("");
  }
}

const destino = join(pasta, "REVISAO.md");
writeFileSync(destino, L.join("\n"), "utf8");

/* HTML junto, e não só markdown.

   O .md serve pra grep e pra diff entre rodadas. Mas revisar de verdade é
   abrir isto ao lado do vídeo tocando, e a máquina do Yan não tem editor que
   renderize markdown (o Obsidian só enxerga o que está dentro do vault, e esta
   pasta não está). Sem o HTML, "revisar" viraria ler JSON, que é o que este
   script existe pra evitar.

   Página solta, sem dependência: abre com dois cliques e funciona offline. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const H = [];
H.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
H.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
H.push("<title>Revisão das transcrições</title><style>");
H.push(`
:root{--bg:#faf9f7;--tx:#1c1a17;--mu:#6b6560;--li:#e2ddd6;--ac:#7c5cbf;--av:#b45309;--ok:#15803d}
@media(prefers-color-scheme:dark){:root{--bg:#17151a;--tx:#eae6e1;--mu:#9d968e;--li:#312c36;--ac:#b39ae8;--av:#fbbf24;--ok:#4ade80}}
*{box-sizing:border-box}
body{margin:0;padding:2rem 1.25rem 6rem;background:var(--bg);color:var(--tx);
 font:16px/1.65 -apple-system,"Segoe UI",system-ui,sans-serif;max-width:60rem;margin-inline:auto}
h1{font-size:1.6rem;margin:0 0 .3rem}
h2{font-size:1.25rem;margin:2.5rem 0 .75rem;padding-top:1.5rem;border-top:2px solid var(--li)}
h3{font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mu);margin:1.5rem 0 .75rem}
.sub{color:var(--mu);margin:0 0 1.5rem}
.check{background:color-mix(in srgb,var(--ac) 9%,transparent);border-left:3px solid var(--ac);
 border-radius:0 6px 6px 0;padding:1rem 1.25rem;margin:0 0 2rem}
.check p{margin:.4rem 0}
.check b{color:var(--ac)}
table{border-collapse:collapse;width:100%;margin:0 0 1rem;font-size:.9rem}
td{padding:.35rem .7rem;border-bottom:1px solid var(--li);vertical-align:top}
td:first-child{color:var(--mu);white-space:nowrap;width:1%}
.aviso{color:var(--av);border:1px solid var(--av);border-radius:6px;padding:.6rem .9rem;
 margin:0 0 1.25rem;font-size:.9rem}
.fala{margin:0 0 1.1rem;padding-left:2.6rem;position:relative}
.n{position:absolute;left:0;top:.1rem;color:var(--mu);font-size:.8rem;font-variant-numeric:tabular-nums}
.tag{display:inline-block;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;
 background:var(--li);color:var(--mu);border-radius:3px;padding:.1rem .4rem;margin-right:.4rem;
 vertical-align:.1em}
.txt{font-size:1.05rem}
.meta{color:var(--mu);font-size:.83rem;margin-top:.15rem}
.meta code{background:var(--li);border-radius:3px;padding:0 .3rem;font-size:.92em}
.rep{color:var(--av)}
.g{color:var(--ok);font-weight:600}
`);
H.push("</style></head><body>");
H.push("<h1>Revisão das transcrições</h1>");
H.push('<p class="sub">' + arquivos.length + " arquivo(s) · gerado em " + new Date().toISOString().slice(0, 10) + "</p>");
H.push('<div class="check"><p><b>O que conferir, em ordem de quanto custa errar:</b></p>');
H.push("<p><b>1. As palavras são dela?</b> Modelo de linguagem corrige gramática por reflexo. Se o texto parecer melhor escrito que a fala dela, a ficha aprende a voz errada, e o erro sai bonito: ninguém desconfia depois.</p>");
H.push("<p><b>2. Alguma cena foi inventada?</b> Cena que entra no catálogo vira exemplo de “isso funciona” nas gerações seguintes.</p>");
H.push("<p><b>3. A origem da imagem está certa?</b> <code>gravada</code> alimenta o catálogo, <code>banco</code> não.</p>");
H.push("<p><b>4. A quebra em falas está como ela grava?</b> É o que define o tamanho de cada take.</p></div>");

for (const nome of arquivos) {
  const d = JSON.parse(readFileSync(join(pasta, nome), "utf8"));
  const r = d.roteiro ?? {};
  const falas = r.falas ?? [];

  H.push("<h2>" + esc(d.arquivo ?? nome) + "</h2>");
  H.push("<table>");
  const linha = (k, v) => H.push("<tr><td>" + k + "</td><td>" + v + "</td></tr>");
  linha("Título", esc(r.titulo));
  linha("Pilar", esc(r.pilar));
  linha("Voz", esc(r.voz));
  linha("Pessoa na câmera", esc(r.pessoa_na_camera));
  linha(
    "Origem da imagem",
    '<span class="' + (r.origem_imagem === "gravada" ? "g" : "") + '">' + esc(r.origem_imagem) + "</span>" +
      (r.origem_imagem === "gravada" ? " — entra no catálogo se você confirmar" : ""),
  );
  linha("Local", esc(r.local_observado) || "<em>vazio</em>");
  linha("Legenda queimada", esc(r.legenda_queimada));
  linha("Duração declarada", esc(r.duracao_segundos) + "s");
  linha("Modelo · tokens", esc(d.modelo) + " · " + esc(d.tokens?.entrada) + " entrada / " + esc(d.tokens?.saida) + " saída");
  H.push("</table>");

  const rep = falas.filter((f, i) => i > 0 && f.texto.trim() === falas[i - 1].texto.trim()).length;
  if (rep > 0) {
    H.push(
      '<p class="aviso">⚠ ' + rep + " fala(s) repetem o texto da anterior. Provavelmente é um texto só segurado enquanto a imagem de fundo troca.</p>",
    );
  }

  H.push("<h3>Falas (" + falas.length + ")</h3>");
  for (const [i, f] of falas.entries()) {
    const igual = i > 0 && f.texto.trim() === falas[i - 1].texto.trim();
    H.push('<div class="fala"><span class="n">' + (i + 1) + "</span>");
    H.push('<div class="txt' + (igual ? " rep" : "") + '"><span class="tag">' + esc(f.funcao || "?") + "</span>" + esc(f.texto) + "</div>");
    const cena = [f.enquadramento, f.cenario, f.acao].filter((x) => x && x.trim()).map(esc).join(" · ");
    if (cena) H.push('<div class="meta"><code>cena</code> ' + cena + "</div>");
    if (f.texto_tela?.trim()) H.push('<div class="meta"><code>tela</code> ' + esc(f.texto_tela) + "</div>");
    if (f.broll?.trim()) H.push('<div class="meta"><code>broll</code> ' + esc(f.broll) + "</div>");
    if (f.observacao?.trim()) H.push('<div class="meta"><code>obs</code> ' + esc(f.observacao) + "</div>");
    H.push("</div>");
  }
}
H.push("</body></html>");

const destinoHtml = join(pasta, "REVISAO.html");
writeFileSync(destinoHtml, H.join("\n"), "utf8");

console.log("Escrito (" + arquivos.length + " transcrição(ões)):");
console.log("  " + destinoHtml + "   ← abre este no navegador");
console.log("  " + destino);

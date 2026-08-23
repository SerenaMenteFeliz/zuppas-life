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
console.log("Escrito: " + destino + "  (" + arquivos.length + " transcrição(ões))");

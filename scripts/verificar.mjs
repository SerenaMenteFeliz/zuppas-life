/* Verificação de comportamento do miolo do Zuppas Life.

   Roda com `npm run verificar`.

   Por que existe: `tsc` e `eslint` provam que o código compila e está
   arrumado, e não provam nada sobre o que ele **faz**. A lógica que decide o
   dia da casa (recorrência, rodízio, vigência, corrente, folga, leitura de
   frase) é fácil de quebrar sem que nada acuse, e o resultado de quebrar é a
   família ver o dia errado. Aqui as regras ficam escritas como asserção.

   Não usa framework de teste de propósito: compila as bibliotecas com o `tsc`
   que já é dependência, roda com o Node puro, e sai com código diferente de
   zero se algo falhar. Uma dependência a menos pra manter num projeto de casa.

   Cobre só `lib/`, que é onde mora a decisão. Componente e tela continuam
   sendo verificados abrindo o app. */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const saida = mkdtempSync(join(tmpdir(), "zuppas-verificar-"));

try {
  /* Chama o `tsc` pelo arquivo dele, não por `npx`. No Windows, o Node se
     recusa a executar `.cmd` sem shell desde a correção de segurança do
     spawn, e ligar o shell só pra isso abriria a porta de injeção de argumento
     à toa. O binário do TypeScript é um `.js`, então o próprio Node roda. */
  execFileSync(
    process.execPath,
    [
      join("node_modules", "typescript", "bin", "tsc"),
      "lib/types.ts",
      "lib/datas.ts",
      "lib/agenda.ts",
      "lib/dados.ts",
      "lib/texto.ts",
      "--outDir",
      saida,
      "--module",
      "esnext",
      "--target",
      "es2020",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
    ],
    { stdio: "inherit" }
  );

  /* O `tsc` emite import sem extensão, que o Node em modo ESM não resolve. */
  for (const arquivo of readdirSync(saida).filter((f) => f.endsWith(".js"))) {
    const caminho = join(saida, arquivo);
    writeFileSync(
      caminho,
      readFileSync(caminho, "utf8").replace(/from "(\.\/[a-z]+)"/g, 'from "$1.js"')
    );
  }

  const { valeNoDia, donoNoDia, ocorrenciasDoDia, ehDe, corrente, detalheDaCorrente, melhorCorrente, indexar, estadoDa, diaDoTracker } =
    await import(pathToFileURL(join(saida, "agenda.js")).href);
  const { diaDaSemana, inicioDaSemana, diasDaSemana, haQuantoTempo, porExtenso } =
    await import(pathToFileURL(join(saida, "datas.js")).href);
  const { interpretar } = await import(pathToFileURL(join(saida, "texto.js")).href);
  const { ITENS, VOLTA_AS_AULAS } = await import(
    pathToFileURL(join(saida, "dados.js")).href
  );

  const falhas = [];
  const ok = (nome, condicao, extra = "") => {
    console.log(`${condicao ? "  ok " : "FALHA"} ${nome}${extra ? ` :: ${extra}` : ""}`);
    if (!condicao) falhas.push(nome);
  };

  /* Data fixa de propósito: teste que depende de "hoje" passa a falhar sozinho
     num dia qualquer, e aí ninguém confia mais nele. 24/07/2026 é uma sexta. */
  const HOJE = "2026-07-24";
  const ancoras = ITENS.filter((i) => i.ancora).map((i) => i.id);
  const conc = (id, data, tipo = "feito") => ({
    chave: `${id}|${data}`,
    itemId: id,
    data,
    pessoa: "Liz",
    feitoEm: "x",
    tipo,
  });
  const fechar = (...datas) => indexar(datas.flatMap((d) => ancoras.map((a) => conc(a, d))));

  console.log("\n── Datas ──────────────────────────────────────────────");
  ok("24/07/2026 é sexta", diaDaSemana(HOJE) === 5, porExtenso(HOJE));
  ok("a semana da casa começa na segunda", inicioDaSemana(HOJE) === "2026-07-20");
  ok("a semana tem 7 dias, de segunda a domingo", diasDaSemana(HOJE).length === 7);
  ok("idade em linguagem de gente", haQuantoTempo("2026-07-04", HOJE) === "há 2 semanas");

  console.log("\n── Recorrência e vigência ─────────────────────────────");
  const escola = ITENS.filter((i) => i.categoria === "escola");
  ok("escola some nas férias", escola.every((i) => !valeNoDia(i, HOJE)));
  ok("escola volta na data da volta às aulas", escola.every((i) => valeNoDia(i, VOLTA_AS_AULAS)));
  ok("escola não cai no sábado", escola.every((i) => !valeNoDia(i, "2026-08-01")));
  const varrer = ITENS.find((i) => i.id === "c4");
  ok("varrer cai na segunda", valeNoDia(varrer, "2026-07-20"));
  ok("varrer não cai na terça", !valeNoDia(varrer, "2026-07-21"));

  console.log("\n── Rodízio ────────────────────────────────────────────");
  ok(
    "o dono não muda no meio da semana",
    donoNoDia(varrer, "2026-07-20") === donoNoDia(varrer, "2026-07-23")
  );
  ok(
    "o rodízio passa pelas 3 pessoas",
    new Set(["2026-07-20", "2026-07-27", "2026-08-03"].map((d) => donoNoDia(varrer, d))).size === 3
  );

  console.log("\n── Feito, pulado e corrente ───────────────────────────");
  const m = indexar([conc("a1", HOJE), conc("a2", HOJE, "pulado")]);
  ok("feito e pulado são estados diferentes", estadoDa(`a1|${HOJE}`, m) === "feito" && estadoDa(`a2|${HOJE}`, m) === "pulado");
  ok("sem marca é aberto", estadoDa(`a3|${HOJE}`, m) === "aberto");
  ok(
    "registro antigo sem tipo conta como feito",
    indexar([{ chave: `a1|${HOJE}`, itemId: "a1", data: HOJE, pessoa: "Liz", feitoEm: "x" }]).feitas.has(`a1|${HOJE}`)
  );
  ok("pular não fecha o dia", corrente(HOJE, ITENS, indexar(ancoras.map((a) => conc(a, HOJE, "pulado"))).feitas) === 0);
  ok("fechar as 3 âncoras fecha o dia", corrente(HOJE, ITENS, fechar(HOJE).feitas) === 1);

  console.log("\n── Folga da semana ────────────────────────────────────");
  const comBuraco = fechar("2026-07-20", "2026-07-21", "2026-07-22", "2026-07-24");
  ok("sem folga a corrente para no buraco", corrente(HOJE, ITENS, comBuraco.feitas, false) === 1);
  ok("com folga a corrente atravessa um buraco", corrente(HOJE, ITENS, comBuraco.feitas, true) === 4);
  const det = detalheDaCorrente(HOJE, ITENS, comBuraco.feitas, true);
  ok("só a folga que salvou alguma coisa é registrada", det.folgas.length === 1 && det.folgas[0] === "2026-07-23", det.folgas.join(","));
  ok(
    "dois buracos na mesma semana param a corrente",
    corrente(HOJE, ITENS, fechar("2026-07-20", "2026-07-22", "2026-07-24").feitas, true) === 2
  );
  ok("folga não cria corrente do zero", corrente(HOJE, ITENS, fechar("2026-07-22").feitas, true) === 0);
  ok("o recorde ignora folga e conta só dia feito", melhorCorrente(HOJE, ITENS, comBuraco.feitas) === 3);

  console.log("\n── Tracker ────────────────────────────────────────────");
  const cheio = diaDoTracker(HOJE, HOJE, ITENS, fechar(HOJE).feitas);
  ok("dia cheio", cheio.fechado && cheio.feitas === cheio.total);
  const futuro = diaDoTracker("2026-08-30", HOJE, ITENS, fechar(HOJE).feitas);
  ok("dia futuro é marcado como futuro", futuro.futuro && !futuro.fechado);
  const parcial = diaDoTracker("2026-07-22", HOJE, ITENS, indexar([conc(ancoras[0], "2026-07-22")]).feitas);
  ok("dia parcial não fecha mas aparece", !parcial.fechado && parcial.feitas === 1);

  console.log("\n── Participação (o dia da Akiane) ─────────────────────");
  const dela = ocorrenciasDoDia(HOJE, ITENS, []).filter((o) => ehDe(o, "Akiane")).map((o) => o.titulo);
  ok("alongamento fica fora do dia dela", !dela.includes("Alongamento ao acordar"), dela.join(" | "));
  ok("meditação entra", dela.includes("Meditação guiada pela Liz"));
  const naSegunda = ocorrenciasDoDia(VOLTA_AS_AULAS, ITENS, []).filter((o) => ehDe(o, "Akiane")).map((o) => o.titulo);
  ok("a escola entra no dia dela pelo campo envolve", naSegunda.includes("Liz leva a Akiane"));

  console.log("\n── Frase em português ─────────────────────────────────");
  const casos = [
    ["amanhã 9h dentista da Akiane", { data: "2026-07-25", horario: "09:00", para: "Akiane" }],
    ["hoje à noite louça", { data: HOJE, bloco: "noite" }],
    ["segunda 14h30 reunião da escola", { data: "2026-07-27", horario: "14:30" }],
    ["30/07 consulta", { data: "2026-07-30" }],
    ["dia 3 pagar o aluguel", { data: "2026-08-03" }],
    ["lembrete comprar pão pra casa", { para: "Casa", tipo: "lembrete" }],
    ["depois de amanhã mercado", { data: "2026-07-26" }],
    ["sexta que vem trilha", { data: "2026-07-31" }],
  ];
  for (const [frase, esperado] of casos) {
    const lido = interpretar(frase, HOJE);
    const erradas = Object.entries(esperado).filter(([k, v]) => lido[k] !== v);
    ok(`"${frase}"`, erradas.length === 0, `título="${lido.titulo}"${erradas.length ? ` ✗ ${erradas.map(([k]) => `${k}=${lido[k]}`).join(" ")}` : ""}`);
  }
  ok("frase sem marcador vira só título", interpretar("arrumar o quintal", HOJE).titulo === "arrumar o quintal");
  ok(
    "acento não come letra do título",
    interpretar("amanhã ligar pro médico", HOJE).titulo === "ligar pro médico",
    interpretar("amanhã ligar pro médico", HOJE).titulo
  );

  console.log(
    falhas.length
      ? `\n✗ ${falhas.length} falha(s):\n  ${falhas.join("\n  ")}\n`
      : "\n✓ tudo passou\n"
  );
  process.exitCode = falhas.length ? 1 : 0;
} finally {
  rmSync(saida, { recursive: true, force: true });
}

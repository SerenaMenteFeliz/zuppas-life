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
      "lib/conteudo-calendario.ts",
      /* A decisão da cascata de IA (que modelo, que chave, em que ordem) mora
         em lib/ia/cascata.ts justamente pra caber aqui: ela é pura e não
         importa nada. Sai em `saida/ia/cascata.js` porque o `tsc` preserva a
         estrutura de pastas a partir da raiz comum. */
      "lib/ia/cascata.ts",
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

  const {
    valeNoDia,
    ocorrenciasDoDia,
    ordenar,
    ehDe,
    ehDoMural,
    ehComigo,
    corrente,
    detalheDaCorrente,
    melhorCorrente,
    indexar,
    estadoDa,
    emAberto,
    quemFez,
    quemPegou,
    participou,
    placar,
    diaDoTracker,
  } = await import(pathToFileURL(join(saida, "agenda.js")).href);
  const { diaDaSemana, inicioDaSemana, diasDaSemana, haQuantoTempo, porExtenso } =
    await import(pathToFileURL(join(saida, "datas.js")).href);
  const { interpretar } = await import(pathToFileURL(join(saida, "texto.js")).href);
  const {
    gradeDoMes,
    deslocarMes,
    mesValido,
    gradeDaSemana,
    deslocarSemana,
    semanaValida,
    rotuloDaSemana,
  } = await import(
    pathToFileURL(join(saida, "conteudo-calendario.js")).href
  );
  const { ITENS, PENDENCIAS, COMPROMISSOS, VOLTA_ANDRE, VOLTA_AKIANE } =
    await import(pathToFileURL(join(saida, "dados.js")).href);
  const { faixaDe, PESSOAS } = await import(
    pathToFileURL(join(saida, "types.js")).href
  );
  const { ordemDeTentativas, classificarFalha, proximoResetPacifico, lerChaves, extrairTexto } =
    await import(pathToFileURL(join(saida, "ia", "cascata.js")).href);
  const falhas = [];
  const ok = (nome, condicao, extra = "") => {
    console.log(`${condicao ? "  ok " : "FALHA"} ${nome}${extra ? ` :: ${extra}` : ""}`);
    if (!condicao) falhas.push(nome);
  };

  /* Data fixa de propósito: teste que depende de "hoje" passa a falhar sozinho
     num dia qualquer, e aí ninguém confia mais nele. 24/07/2026 é uma sexta. */
  const HOJE = "2026-07-24";
  const ancoras = ITENS.filter((i) => i.ancora).map((i) => i.id);
  const conc = (id, data, tipo = "feito", pessoa = "Liz") => ({
    chave: `${id}|${data}`,
    itemId: id,
    data,
    pessoa,
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
  const doAndre = escola.filter((i) => i.valeDe === VOLTA_ANDRE);
  const daAkiane = escola.filter((i) => i.valeDe === VOLTA_AKIANE);
  ok("escola some nas férias", escola.every((i) => !valeNoDia(i, HOJE)));
  ok("os dois têm horário de escola", doAndre.length === 2 && daAkiane.length === 2);
  ok("o André volta em 27/07", doAndre.every((i) => valeNoDia(i, VOLTA_ANDRE)));
  ok(
    "a Akiane ainda não volta quando o André volta",
    daAkiane.every((i) => !valeNoDia(i, VOLTA_ANDRE))
  );
  ok("a Akiane volta em 03/08", daAkiane.every((i) => valeNoDia(i, VOLTA_AKIANE)));
  ok("escola não cai no sábado", escola.every((i) => !valeNoDia(i, "2026-08-01")));
  const varrer = ITENS.find((i) => i.id === "c4");
  ok("varrer cai na segunda", valeNoDia(varrer, "2026-07-20"));
  ok("varrer não cai na terça", !valeNoDia(varrer, "2026-07-21"));

  console.log("\n── Mural (a casa sem dono fixo) ───────────────────────");
  const doDia = ocorrenciasDoDia(HOJE, ITENS, []);
  const casa = doDia.filter((o) => o.categoria === "casa" || o.categoria === "biro");
  ok(
    "tarefa de casa e Biro ficam no mural, menos as do André",
    casa.every((o) => ehDoMural(o) || o.dono === "André" || o.dono === "Akiane"),
    casa.filter((o) => !ehDoMural(o)).map((o) => `${o.titulo}=${o.dono}`).join(" | ")
  );
  ok("o Biro sai 4 vezes por dia", doDia.filter((o) => o.categoria === "biro").length === 4);
  ok("nenhum item tem rodízio", ITENS.every((i) => !("rodizio" in i)));
  const mural = casa.find(ehDoMural);
  ok("mural não é de ninguém por padrão", !ehDe(mural, "Ge") && !ehDe(mural, "Yan"));
  ok(
    "mas passa a ser de quem pegou",
    ehComigo(mural, "Ge", indexar([conc(mural.id, HOJE, "pego", "Ge")])),
    mural.titulo
  );

  console.log("\n── Faixa do dia ───────────────────────────────────────");
  const meditacao = ITENS.find((i) => i.id === "a2");
  ok("a meditação não tem hora fixa", meditacao.bloco === undefined);
  ok("item sem bloco cai na faixa solta", faixaDe(meditacao) === "solto");
  ok(
    "o que não tem hora aparece antes do dia",
    faixaDe(ordenar(doDia)[0]) === "solto",
    ordenar(doDia)[0].titulo
  );

  console.log("\n── Feito, pego, pulado ────────────────────────────────");
  const m = indexar([conc("a1", HOJE), conc("a2", HOJE, "pulado"), conc("a3", HOJE, "pego")]);
  ok("feito e pulado são estados diferentes", estadoDa(`a1|${HOJE}`, m) === "feito" && estadoDa(`a2|${HOJE}`, m) === "pulado");
  ok("pego é estado próprio", estadoDa(`a3|${HOJE}`, m) === "pego");
  ok("pego ainda conta como em aberto", emAberto("pego") && !emAberto("feito") && !emAberto("pulado"));
  ok("sem marca é aberto", estadoDa(`c1|${HOJE}`, m) === "aberto");
  ok(
    "registro antigo sem tipo conta como feito",
    indexar([{ chave: `a1|${HOJE}`, itemId: "a1", data: HOJE, pessoa: "Liz", feitoEm: "x" }]).feitas.has(`a1|${HOJE}`)
  );

  console.log("\n── Várias pessoas na mesma tarefa ─────────────────────");
  const juntas = indexar([
    conc("c1", HOJE, "feito", "Liz"),
    conc("c1", HOJE, "feito", "Ge"),
    conc("c1", HOJE, "feito", "Camilla"),
  ]);
  ok("três pessoas cabem na mesma tarefa", quemFez(`c1|${HOJE}`, juntas).length === 3);
  ok("e a tarefa aconteceu uma vez só", estadoDa(`c1|${HOJE}`, juntas) === "feito");
  ok("dá pra perguntar se alguém participou", participou(`c1|${HOJE}`, "Ge", juntas) && !participou(`c1|${HOJE}`, "Yan", juntas));
  const misto = indexar([conc("c4", HOJE, "pulado", "Yan"), conc("c4", HOJE, "feito", "Ge")]);
  ok("um pular não apaga o fazer do outro", estadoDa(`c4|${HOJE}`, misto) === "feito");
  const pegou = indexar([conc("b1", HOJE, "pego", "Camilla")]);
  ok("quem pegou aparece", quemPegou(`b1|${HOJE}`, pegou)[0] === "Camilla");
  ok("mesma pessoa não entra duas vezes", quemFez(`c1|${HOJE}`, indexar([conc("c1", HOJE, "feito", "Ge"), conc("c1", HOJE, "feito", "Ge")])).length === 1);

  console.log("\n── Placar da casa ─────────────────────────────────────");
  const linhas = placar(HOJE, [
    conc("c1", HOJE, "feito", "Liz"),
    conc("c2", HOJE, "feito", "Liz"),
    conc("c4", HOJE, "feito", "Ge"),
    conc("b1", HOJE, "pego", "Yan"),
    conc("c5", HOJE, "pulado", "Camilla"),
    conc("c7", "2026-06-01", "feito", "Camilla"),
  ], PESSOAS);
  const daLiz = linhas.find((l) => l.pessoa === "Liz");
  const doYan = linhas.find((l) => l.pessoa === "Yan");
  const daCamilla = linhas.find((l) => l.pessoa === "Camilla");
  ok("conta o que cada um fez", daLiz.feitas === 2);
  ok("a maior contagem vem primeiro", linhas[0].pessoa === "Liz");
  ok("pegar sem terminar conta separado", doYan.pegas === 1 && doYan.feitas === 0);
  ok("pular não conta como fazer", daCamilla.feitas === 0);
  ok("fora da janela de 7 dias não entra", daCamilla.feitas === 0 && placar(HOJE, [conc("c7", "2026-06-01", "feito", "Camilla")], PESSOAS).every((l) => l.feitas === 0));
  ok("todo mundo aparece, inclusive com zero", linhas.length === PESSOAS.length);
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

  console.log("\n── O dia da Akiane ────────────────────────────────────");
  const daAkianeNoDia = (data) =>
    ocorrenciasDoDia(data, ITENS, []).filter((o) => o.akiane || ehDe(o, "Akiane"));
  const dela = daAkianeNoDia(HOJE).map((o) => o.titulo);
  ok("a sequência dela é curta", dela.length <= 6, `${dela.length} :: ${dela.join(" | ")}`);
  ok("o mercado não cai na tela dela", !dela.includes("Mercado da semana"));
  ok("banheiro e louça também não", !dela.includes("Banheiros (2)") && !dela.includes("Louça"));
  ok("corrida e Biro saíram do dia dela", !dela.includes("Corrida") && !dela.some((t) => t.startsWith("Biro")));
  ok("as âncoras entram", dela.includes("Alongamento ao acordar") && dela.includes("Meditação guiada pela Liz"));
  ok("brincar e ajudar entram", dela.includes("Brincar") && dela.includes("Ajudar em alguma coisa"));
  ok(
    "a escola dela não entra na volta do André",
    !daAkianeNoDia(VOLTA_ANDRE).some((o) => o.titulo === "Liz leva a Akiane")
  );
  ok(
    "e entra na volta dela",
    daAkianeNoDia(VOLTA_AKIANE).some((o) => o.titulo === "Liz leva a Akiane")
  );

  console.log("\n── Semente sem invenção ───────────────────────────────");
  ok("nenhum compromisso semeado com data chutada", COMPROMISSOS.length === 0);
  ok("a pendência da volta às aulas saiu (foi confirmada)", !PENDENCIAS.some((p) => p.titulo.includes("volta às aulas")));
  ok("a tarefa de trilha inventada saiu", !PENDENCIAS.some((p) => p.titulo.includes("trilha")));
  ok("as fotos passaram pro Yan", PENDENCIAS.find((p) => p.id === "d2").responsavel === "Yan");
  ok("toda pendência tem responsável real", PENDENCIAS.every((p) => PESSOAS.includes(p.responsavel)));

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

  console.log("\n── Calendário do painel de conteúdo ───────────────────");
  /* Grade de mês erra por um dia sem nada acusar, e o efeito é a Ge ver o post
     no dia errado. Os casos abaixo são as três armadilhas clássicas: mês que
     começa exatamente na segunda (nada de recuo), mês que começa no domingo
     (recuo de 6, o máximo) e fevereiro. */
  const agosto = gradeDoMes("2026-08");
  ok("agosto/2026 cabe em 6 semanas de 7 dias", agosto.length === 6 && agosto.every((s) => s.length === 7));
  ok("a grade começa numa segunda", agosto[0][0].iso === "2026-07-27", agosto[0][0].iso);
  ok("todo dia do mês aparece uma vez", agosto.flat().filter((c) => c.doMes).length === 31);
  ok("dia de fora vem marcado", agosto[0][0].doMes === false);

  const marco = gradeDoMes("2026-03"); // 2026-03-01 é domingo: recuo máximo
  ok("mês que começa no domingo recua 6 dias", marco[0][0].iso === "2026-02-23", marco[0][0].iso);
  ok("março tem 31 dias na grade", marco.flat().filter((c) => c.doMes).length === 31);

  const junho = gradeDoMes("2026-06"); // 2026-06-01 é segunda: sem recuo
  ok("mês que começa na segunda não recua", junho[0][0].iso === "2026-06-01", junho[0][0].iso);

  ok("fevereiro de ano comum tem 28", gradeDoMes("2026-02").flat().filter((c) => c.doMes).length === 28);
  ok("fevereiro bissexto tem 29", gradeDoMes("2028-02").flat().filter((c) => c.doMes).length === 29);

  ok("virada de ano pra frente", deslocarMes("2026-12", 1) === "2027-01", deslocarMes("2026-12", 1));
  ok("virada de ano pra trás", deslocarMes("2026-01", -1) === "2025-12", deslocarMes("2026-01", -1));
  ok("mês inválido na URL cai no mês de referência", mesValido("banana", "2026-08-11") === "2026-08");
  ok("mês 13 é recusado", mesValido("2026-13", "2026-08-11") === "2026-08");
  ok("mês válido na URL é respeitado", mesValido("2026-05", "2026-08-11") === "2026-05");

  console.log("\n── Visão de semana do calendário ──────────────────────");
  /* Mesma classe de erro da grade de mês, e mais fácil de cometer: aqui a conta
     é "recuar até a segunda", e errar um dia coloca o post na célula errada sem
     nada acusar. Os casos cobrem cada dia da semana como entrada, virada de mês
     no meio da semana e virada de ano. */
  const semanaDeSexta = gradeDaSemana(semanaValida("2026-08-21", "2026-08-21")); // 21/08 é sexta
  ok("a semana começa na segunda", semanaDeSexta[0].iso === "2026-08-17", semanaDeSexta[0].iso);
  ok("a semana tem 7 dias", semanaDeSexta.length === 7);
  ok("a semana termina no domingo", semanaDeSexta[6].iso === "2026-08-23", semanaDeSexta[6].iso);
  ok("todo dia da semana é do período", semanaDeSexta.every((c) => c.doMes));

  ok(
    "segunda como entrada não recua",
    gradeDaSemana(semanaValida("2026-08-17", "2026-08-17"))[0].iso === "2026-08-17"
  );
  ok(
    "domingo como entrada recua 6 dias",
    gradeDaSemana(semanaValida("2026-08-23", "2026-08-23"))[0].iso === "2026-08-17",
    gradeDaSemana(semanaValida("2026-08-23", "2026-08-23"))[0].iso
  );

  ok("semana inválida na URL cai na semana de hoje", semanaValida("banana", "2026-08-21") === "2026-08-17");
  ok("31 de fevereiro é recusado", semanaValida("2026-02-31", "2026-08-21") === "2026-08-17");
  ok("semana válida na URL é respeitada", semanaValida("2026-05-06", "2026-08-21") === "2026-05-04");

  ok("avançar uma semana anda 7 dias", deslocarSemana("2026-08-17", 1) === "2026-08-24");
  ok("voltar uma semana anda 7 dias", deslocarSemana("2026-08-17", -1) === "2026-08-10");
  ok("virada de mês no meio da semana", deslocarSemana("2026-08-31", -1) === "2026-08-24");
  ok("virada de ano pra frente na semana", deslocarSemana("2026-12-28", 1) === "2027-01-04");
  ok("virada de ano pra trás na semana", deslocarSemana("2027-01-04", -1) === "2026-12-28");

  ok(
    "rótulo de semana dentro do mesmo mês",
    rotuloDaSemana("2026-08-17") === "17 a 23 de agosto",
    rotuloDaSemana("2026-08-17")
  );
  ok(
    "rótulo de semana que vira o mês",
    rotuloDaSemana("2026-08-31") === "31 de agosto a 6 de setembro",
    rotuloDaSemana("2026-08-31")
  );
  ok(
    "rótulo de semana que vira o ano",
    rotuloDaSemana("2026-12-28") === "28 de dezembro de 2026 a 3 de janeiro de 2027",
    rotuloDaSemana("2026-12-28")
  );

  /* ── Cascata de IA (22/08/2026) ──────────────────────────────────────────────

     O que se prova aqui é a ORDEM e a CLASSIFICAÇÃO, que é onde uma quebra sai
     cara e calada: ordem invertida faz a tarefa mecânica gastar a cota do
     melhor modelo, e confundir 429 com credencial faz o sistema tentar pra
     sempre uma chave revogada sem nunca avisar. */

  const M = ["m1", "m2"];
  const K = ["k1", "k2", "k3"];
  const nada = new Set();

  ok(
    "ordem percorre CONTA dentro do MODELO, não o contrário",
    ordemDeTentativas(M, K, nada)
      .map((b) => b.modelo + "/" + b.chave)
      .join(" ") === "m1/k1 m1/k2 m1/k3 m2/k1 m2/k2 m2/k3",
    ordemDeTentativas(M, K, nada).map((b) => b.modelo + "/" + b.chave).join(" ")
  );

  ok(
    "balde esgotado é pulado na 1ª volta e tentado na 2ª",
    ordemDeTentativas(M, K, new Set(["k1|m1"]))
      .map((b) => b.modelo + "/" + b.chave)
      .join(" ") === "m1/k2 m1/k3 m2/k1 m2/k2 m2/k3 m1/k1",
    ordemDeTentativas(M, K, new Set(["k1|m1"])).map((b) => b.modelo + "/" + b.chave).join(" ")
  );

  ok(
    "tudo esgotado ainda tenta tudo, em vez de desistir",
    ordemDeTentativas(["m1"], ["k1", "k2"], new Set(["k1|m1", "k2|m1"])).length === 2,
    ordemDeTentativas(["m1"], ["k1", "k2"], new Set(["k1|m1", "k2|m1"])).length
  );

  ok(
    "nenhum balde aparece duas vezes",
    (() => {
      const o = ordemDeTentativas(M, K, new Set(["k1|m1", "k3|m2"]));
      return new Set(o.map((b) => b.chave + "|" + b.modelo)).size === o.length && o.length === 6;
    })(),
    "duplicata ou balde faltando"
  );

  ok("429 é cota, não credencial", classificarFalha(429, "") === "cota");
  ok("403 é chave morta", classificarFalha(403, "") === "chave-morta");
  ok(
    "400 com API_KEY_INVALID é chave morta, não falha genérica",
    classificarFalha(400, '{"error":{"status":"INVALID_ARGUMENT","message":"API_KEY_INVALID"}}') ===
      "chave-morta"
  );
  ok("404 de modelo inexistente só passa adiante", classificarFalha(404, "not found") === "falhou");
  ok("500 do Google só passa adiante", classificarFalha(500, "oops") === "falhou");

  ok(
    "reset do Pacífico cai numa meia-noite de lá, e no futuro",
    (() => {
      const agora = new Date("2026-08-22T23:06:00Z");
      const r = proximoResetPacifico(agora);
      const hora = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hour12: false,
      }).format(r);
      return r > agora && r.getTime() - agora.getTime() <= 26 * 3600e3 && hora === "00";
    })(),
    proximoResetPacifico(new Date("2026-08-22T23:06:00Z")).toISOString()
  );

  ok(
    "chaves viram rótulos estáveis e espaço não conta como chave",
    JSON.stringify(lerChaves(" a , b ,, ")) ===
      JSON.stringify([
        { rotulo: "chave-1", valor: "a" },
        { rotulo: "chave-2", valor: "b" },
      ]),
    JSON.stringify(lerChaves(" a , b ,, "))
  );

  ok("sem chave nenhuma, lista vazia", lerChaves(undefined).length === 0);

  ok(
    "acha o texto em output_text",
    extrairTexto('{"output_text":"{\\"falas\\":[]}"}') === '{"falas":[]}'
  );
  ok(
    "acha o texto aninhado quando output_text não vem",
    extrairTexto('{"steps":[{"content":[{"text":"oi"}]}]}') === "oi"
  );
  ok("resposta ilegível devolve null em vez de estourar", extrairTexto("nao e json") === null);

  /* Envelope REAL de uma chamada de 22/08/2026 ao /v1beta/interactions, com o
     campo `signature` encurtado. Está aqui porque a documentação prometia um
     `output_text` que NÃO existe na resposta crua, e porque o primeiro `step`
     é um `thought` sem texto: quem parasse no primeiro item da lista pegaria
     null e concluiria que a IA não respondeu. */
  const ENVELOPE_REAL = JSON.stringify({
    status: "completed",
    usage: { total_tokens: 78, total_input_tokens: 40, total_output_tokens: 38 },
    created: "2026-08-23T01:25:03Z",
    steps: [
      { signature: "EmcKZQERTTIPCOnFgqpS", type: "thought" },
      {
        content: [
          { text: '{\n  "frase": "Você dorme oito horas?",\n  "funcao": "gancho"\n}', type: "text" },
        ],
        type: "model_output",
      },
    ],
    object: "interaction",
    model: "gemini-3.7-flash",
  });

  ok(
    "envelope real do Gemini: acha o texto pulando o step de raciocínio",
    JSON.parse(extrairTexto(ENVELOPE_REAL)).funcao === "gancho",
    extrairTexto(ENVELOPE_REAL)
  );

  /* Os 6 testes da contagem de falas vinda da visão do banco saíram em
     01/09/2026, junto com a função que eles testavam (ver lib/conteudo.ts). */

  console.log(
    falhas.length
      ? `\n✗ ${falhas.length} falha(s):\n  ${falhas.join("\n  ")}\n`
      : "\n✓ tudo passou\n"
  );
  process.exitCode = falhas.length ? 1 : 0;
} finally {
  rmSync(saida, { recursive: true, force: true });
}

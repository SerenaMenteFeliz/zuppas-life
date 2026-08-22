"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { salvarDadosAcao, type CampoEditavel } from "@/app/painel/conteudo/acoes";
import { avisar } from "@/components/painel/Avisos";
import CampoData from "@/components/painel/CampoData";
import CampoTexto from "@/components/painel/CampoTexto";
import Dropdown from "@/components/painel/Dropdown";
import { usePostShell } from "@/components/painel/PostShell";
import {
  FORMATOS,
  PERFIS,
  PILARES,
  STATUS,
  STATUS_INFO,
  type Post,
  type Status,
} from "@/lib/conteudo-tipos";

/* Formulário de dados do post.

   ── Autosave ──

   Não existe botão de salvar. O estado da gravação sobe pro header fixo (ver
   PostShell), que é onde ele fica visível enquanto a página está rolada, e isso
   não é detalhe: trocar "será que cliquei em salvar?" por "será que salvou?"
   não seria ganho nenhum.

   Três gatilhos, porque cada um cobre um jeito de perder trabalho:

   1. Ocioso por 900ms. Enquanto os dedos andam, não adianta gravar.
   2. Ao sair do campo (`blur`). Cobre "escreveu e clicou em outra coisa".
   3. Ao esconder a aba (`visibilitychange`). Cobre fechar, trocar de aba e
      travar o notebook antes dos 900ms.

   Erro de gravação vira aviso na tela, nunca só console: trabalho que some sem
   avisar é a mesma classe de falha que custou 23 leads em 04/08. */

/* Campos que a tela pode mudar. Vale como fonte da verdade pra três coisas:
   o que se manda, o que se compara ao voltar do servidor, e o que se aceita
   de outra aba. */
const CAMPOS: CampoEditavel[] = [
  "titulo",
  "perfil",
  "formato",
  "pilar",
  "status",
  "data_planejada",
  "data_publicada",
  "link",
  "legenda",
  "hashtags",
  "observacao",
];

export default function DadosPost({ post }: { post: Post }) {
  const { reportar, trocarCabecalho } = usePostShell();
  const [valores, setValores] = useState<Post>(post);

  /* Ref espelhando o estado porque os gatilhos de aba escondida e de saída da
     página rodam de dentro de listeners registrados uma vez só: sem o ref, eles
     enxergariam os valores da primeira renderização pra sempre. Atualizado
     dentro de `mexer`, nunca durante o render. */
  const atuais = useRef(valores);
  const sujo = useRef(false);
  const hora = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Campos alterados desde a última gravação: é exatamente isso que sobe. */
  const pendentes = useRef(new Set<CampoEditavel>());
  /* Campos que esta aba tocou em algum momento. Serve pra decidir o que aceitar
     de volta do servidor: campo que ninguém mexeu aqui pode receber o valor de
     outra aba sem risco; campo que está sendo editado, não. */
  const meus = useRef(new Set<CampoEditavel>());

  const gravar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;

    const indo = [...pendentes.current];
    pendentes.current = new Set();
    if (indo.length === 0) return;

    const mudancas: Partial<Record<CampoEditavel, string>> = {};
    for (const campo of indo) {
      mudancas[campo] = (atuais.current[campo] as string | null) ?? "";
    }

    reportar("dados", { estado: "salvando", hora: hora.current });
    try {
      const doServidor = await salvarDadosAcao(post.id, mudancas);

      /* Absorve o que outra aba mudou, mas SÓ em campo que esta aqui nunca
         tocou. Sem a segunda condição, um campo sendo digitado seria
         sobrescrito pela resposta da gravação anterior no meio da frase. */
      if (doServidor) {
        const vindos: Partial<Post> = {};
        let quantos = 0;
        for (const campo of CAMPOS) {
          if (meus.current.has(campo)) continue;
          const remoto = (doServidor[campo] as string | null) ?? "";
          const local = (atuais.current[campo] as string | null) ?? "";
          if (remoto !== local) {
            (vindos as Record<string, unknown>)[campo] = doServidor[campo];
            quantos += 1;
          }
        }
        if (quantos > 0) {
          const proximo = { ...atuais.current, ...vindos };
          atuais.current = proximo;
          setValores(proximo);
          trocarCabecalho({ titulo: proximo.titulo, status: proximo.status as Status });
          avisar("Outra aba mexeu neste post. Atualizei o que você não estava editando.");
        }
      }

      hora.current = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      reportar("dados", { estado: "salvo", hora: hora.current });
    } catch (e) {
      /* Volta a sujo E devolve os campos pra fila: sem a segunda parte, o que
         falhou nunca mais seria enviado, porque a próxima gravação só manda o
         que mudou depois dela. */
      sujo.current = true;
      for (const campo of indo) pendentes.current.add(campo);
      reportar("dados", { estado: "erro", hora: hora.current });
      avisar(e instanceof Error ? e.message : "Não consegui salvar.", "erro");
    }
  }, [post.id, reportar, trocarCabecalho]);

  function mexer(campos: Partial<Post>) {
    const proximo = { ...atuais.current, ...campos };
    atuais.current = proximo;
    setValores(proximo);

    for (const campo of Object.keys(campos) as CampoEditavel[]) {
      pendentes.current.add(campo);
      meus.current.add(campo);
    }

    if (campos.titulo !== undefined || campos.status !== undefined) {
      trocarCabecalho({ titulo: campos.titulo, status: campos.status as Status | undefined });
    }

    sujo.current = true;
    reportar("dados", { estado: "sujo", hora: hora.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void gravar(), 900);
  }

  function agora() {
    if (timer.current) clearTimeout(timer.current);
    void gravar();
  }

  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") agora();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      /* Saindo da página: grava o que estiver pendente em vez de perder os
         últimos caracteres digitados. */
      if (timer.current) clearTimeout(timer.current);
      void gravar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravar]);

  return (
    <div className="glass-card mb-6 p-5">
      <div className="conteudo-grade">
        <label className="conteudo-campo conteudo-campo-largo">
          <span>Título</span>
          {/* Post recém-criado chega sem título e com o campo já focado:
              "Criar" é um clique só, e escrever o nome é o gesto seguinte.
              Em post que já tem nome não rouba o foco. */}
          <input
            type="text"
            value={valores.titulo}
            placeholder="Sobre o que é esse post?"
            autoFocus={post.titulo.trim() === ""}
            onChange={(e) => mexer({ titulo: e.target.value })}
            onBlur={agora}
          />
        </label>

        {/* Os quatro dropdowns daqui não são `<label>` porque o controle não é
            mais um `<select>`: rótulo de formulário aponta pra um campo nativo,
            e clicar nele com um botão dentro dispara duas vezes. O nome do
            campo continua ligado ao controle pelo `rotuloAcessivel`. */}
        <div className="conteudo-campo">
          <span>Perfil</span>
          <Dropdown
            rotuloAcessivel="Perfil"
            valor={valores.perfil}
            opcoes={PERFIS.map((p) => ({ valor: p.id, rotulo: p.rotulo, cor: p.cor }))}
            aoEscolher={(v) => {
              mexer({ perfil: v });
              agora();
            }}
          />
        </div>

        {/* Ordem trocada em 22/08/2026 (Yan): Status subiu pro fim da primeira
            linha, e Formato e Pilar desceram pra segunda. Faz sentido de leitura
            — a primeira linha passou a responder "o que é e onde está" (título,
            perfil, status), e a segunda "como vai ser e quando sai". Status é o
            campo que mais muda ao longo da vida do post, então merece o lugar
            mais alto; formato e pilar se escolhem uma vez e ficam. */}
        <div className="conteudo-campo">
          <span>Status</span>
          <Dropdown
            rotuloAcessivel="Status"
            largura={260}
            valor={valores.status}
            opcoes={STATUS.map((s) => ({
              valor: s,
              rotulo: STATUS_INFO[s].rotulo,
              ajuda: STATUS_INFO[s].ajuda,
            }))}
            aoEscolher={(v) => {
              mexer({ status: v as Status });
              agora();
            }}
          />
        </div>

        <div className="conteudo-campo">
          <span>Formato</span>
          <Dropdown
            rotuloAcessivel="Formato"
            vazio="Sem formato"
            valor={valores.formato ?? ""}
            opcoes={[
              { valor: "", rotulo: "Sem formato" },
              ...FORMATOS.map((f) => ({ valor: f, rotulo: f })),
            ]}
            aoEscolher={(v) => {
              mexer({ formato: v });
              agora();
            }}
          />
        </div>

        <div className="conteudo-campo">
          <span>Pilar</span>
          <Dropdown
            rotuloAcessivel="Pilar"
            vazio="Sem pilar"
            largura={240}
            valor={valores.pilar ?? ""}
            opcoes={[
              { valor: "", rotulo: "Sem pilar" },
              ...PILARES.map((p) => ({ valor: p, rotulo: p })),
            ]}
            aoEscolher={(v) => {
              mexer({ pilar: v });
              agora();
            }}
          />
        </div>

        {/* "Quando quero postar" e "Quando saiu" em vez de "Data planejada" e
            "Data publicada" (Yan, 21/08): "planejada" colidia com o status
            "Agendado" e ninguém sabia qual era qual. A diferença que importa é
            plano contra fato, e é ela que faz o calendário mostrar o que
            aconteceu em vez do que se pretendia. */}
        <div className="conteudo-campo">
          <span>Quando quero postar</span>
          <CampoData
            rotuloAcessivel="Quando quero postar"
            valor={valores.data_planejada ?? ""}
            aoMudar={(v) => {
              mexer({ data_planejada: v });
              agora();
            }}
          />
        </div>

        <div className="conteudo-campo">
          <span>Quando saiu</span>
          <CampoData
            rotuloAcessivel="Quando saiu"
            vazio="Ainda não saiu"
            valor={valores.data_publicada ?? ""}
            aoMudar={(v) => {
              mexer({ data_publicada: v });
              agora();
            }}
          />
        </div>

        {/* Linha inteira como os campos de baixo (Yan, 22/08/2026): URL é texto
            longo, e meia linha só servia pra cortar o fim do link. */}
        <label className="conteudo-campo conteudo-campo-total">
          <span>Link do post publicado</span>
          <input
            type="url"
            value={valores.link ?? ""}
            placeholder="https://"
            onChange={(e) => mexer({ link: e.target.value })}
            onBlur={agora}
          />
        </label>

        <label className="conteudo-campo conteudo-campo-total conteudo-campo-texto">
          <span>Legenda</span>
          <CampoTexto
            minimo={4}
            valor={valores.legenda ?? ""}
            aoMudar={(v) => mexer({ legenda: v })}
            aoSair={agora}
          />
        </label>

        <label className="conteudo-campo conteudo-campo-total">
          <span>Hashtags</span>
          <input
            type="text"
            value={valores.hashtags ?? ""}
            onChange={(e) => mexer({ hashtags: e.target.value })}
            onBlur={agora}
          />
        </label>

        <label className="conteudo-campo conteudo-campo-total conteudo-campo-texto">
          <span>Observação</span>
          <CampoTexto
            minimo={2}
            valor={valores.observacao ?? ""}
            aoMudar={(v) => mexer({ observacao: v })}
            aoSair={agora}
          />
        </label>
      </div>
    </div>
  );
}

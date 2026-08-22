"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { salvarDadosAcao, type DadosDoPost } from "@/app/painel/conteudo/acoes";
import { avisar } from "@/components/painel/Avisos";
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

function paraAcao(post: Post, v: Post): DadosDoPost {
  return {
    id: post.id,
    titulo: v.titulo,
    perfil: v.perfil,
    formato: v.formato,
    pilar: v.pilar,
    status: v.status,
    data_planejada: v.data_planejada,
    data_publicada: v.data_publicada,
    link: v.link,
    legenda: v.legenda,
    hashtags: v.hashtags,
    observacao: v.observacao,
  };
}

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

  const gravar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;
    reportar("dados", { estado: "salvando", hora: hora.current });
    try {
      await salvarDadosAcao(paraAcao(post, atuais.current));
      hora.current = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      reportar("dados", { estado: "salvo", hora: hora.current });
    } catch (e) {
      /* Volta a sujo: a próxima mudança tenta de novo em vez de deixar o
         trabalho preso num estado de erro do qual não se sai sozinho. */
      sujo.current = true;
      reportar("dados", { estado: "erro", hora: hora.current });
      avisar(e instanceof Error ? e.message : "Não consegui salvar.", "erro");
    }
  }, [post, reportar]);

  function mexer(campos: Partial<Post>) {
    const proximo = { ...atuais.current, ...campos };
    atuais.current = proximo;
    setValores(proximo);

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
            vazio="sem formato"
            valor={valores.formato ?? ""}
            opcoes={[
              { valor: "", rotulo: "sem formato" },
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
            vazio="sem pilar"
            largura={240}
            valor={valores.pilar ?? ""}
            opcoes={[
              { valor: "", rotulo: "sem pilar" },
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
        <label className="conteudo-campo">
          <span>Quando quero postar</span>
          <input
            type="date"
            value={valores.data_planejada ?? ""}
            onChange={(e) => mexer({ data_planejada: e.target.value })}
            onBlur={agora}
          />
        </label>

        <label className="conteudo-campo">
          <span>Quando saiu</span>
          <input
            type="date"
            value={valores.data_publicada ?? ""}
            onChange={(e) => mexer({ data_publicada: e.target.value })}
            onBlur={agora}
          />
        </label>

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

        <label className="conteudo-campo conteudo-campo-total">
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

        <label className="conteudo-campo conteudo-campo-total">
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { salvarDadosAcao, type DadosDoPost } from "@/app/painel/conteudo/acoes";
import { avisar } from "@/components/painel/Avisos";
import {
  FORMATOS,
  PERFIS,
  PILARES,
  STATUS,
  STATUS_INFO,
  tituloDe,
  type Post,
  type Status,
} from "@/lib/conteudo-tipos";

/* Cabeçalho e dados do post, numa peça só (21/08/2026).

   Estão juntos porque o cabeçalho reflete o formulário ao vivo: o título que
   está sendo digitado aparece no `h1` na mesma tecla, e trocar o status troca a
   etiqueta ali em cima. Separados, o `h1` só mudaria depois de um recarregamento
   do servidor, e o post recém-criado ficaria "Sem título" enquanto ela escreve
   o nome dele.

   ── Autosave ──

   Não existe mais botão de salvar. O que existe é um indicador de estado onde
   ele ficava, e isso não é detalhe: trocar "será que cliquei em salvar?" por
   "será que salvou?" não seria ganho nenhum.

   Três gatilhos, porque cada um cobre um jeito de perder trabalho:

   1. Ocioso por 900ms. Enquanto os dedos andam, não adianta gravar.
   2. Ao sair do campo (`blur`). Cobre "escreveu e clicou em outra coisa".
   3. Ao esconder a aba (`visibilitychange`). Cobre fechar, trocar de aba e
      travar o notebook antes dos 900ms.

   Erro de gravação vira aviso na tela, nunca só console: roteiro que some sem
   avisar é a mesma classe de falha que custou 23 leads em 04/08. */

type Estado = "parado" | "sujo" | "salvando" | "salvo" | "erro";

function paraAcao(post: Post, campos: Partial<Post>): DadosDoPost {
  const v = { ...post, ...campos };
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

export default function CabecalhoEDados({ post }: { post: Post }) {
  const [valores, setValores] = useState<Post>(post);
  const [estado, setEstado] = useState<Estado>("parado");
  const [horaSalvo, setHoraSalvo] = useState<string | null>(null);

  /* Ref espelhando o estado porque os gatilhos de aba escondida e de saída da
     página rodam de dentro de listeners registrados uma vez só: sem o ref, eles
     enxergariam os valores da primeira renderização pra sempre. Atualizado
     dentro de `mexer`, nunca durante o render. */
  const atuais = useRef(valores);
  const sujo = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gravar = useCallback(async () => {
    if (!sujo.current) return;
    sujo.current = false;
    setEstado("salvando");
    try {
      await salvarDadosAcao(paraAcao(post, atuais.current));
      setEstado("salvo");
      setHoraSalvo(
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      );
    } catch (e) {
      /* Volta a sujo: a próxima mudança tenta de novo em vez de deixar o
         trabalho preso num estado de erro do qual não se sai sozinho. */
      sujo.current = true;
      setEstado("erro");
      avisar(e instanceof Error ? e.message : "Não consegui salvar.", "erro");
    }
  }, [post]);

  function mexer(campos: Partial<Post>) {
    const proximo = { ...atuais.current, ...campos };
    atuais.current = proximo;
    setValores(proximo);
    sujo.current = true;
    setEstado("sujo");
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

  const st = STATUS_INFO[valores.status as Status] ?? STATUS_INFO.ideia;

  return (
    <>
      <header className="mb-6">
        <div className="conteudo-topo">
          <div className="conteudo-topo-titulo">
            <h1
              className="text-3xl"
              style={{
                fontFamily: "var(--font-display)",
                lineHeight: 1.1,
                opacity: valores.titulo.trim() === "" ? 0.45 : 1,
              }}
            >
              {tituloDe(valores)}
            </h1>
            <span className="painel-badge">{st.rotulo}</span>
          </div>
          <Link href="/painel/conteudo" className="conteudo-botao-claro">
            ‹ Conteúdo
          </Link>
        </div>
      </header>

      <div className="glass-card mb-6 p-5">
        <div className="conteudo-grade">
          <label className="conteudo-campo conteudo-campo-largo">
            <span>Título</span>
            <input
              type="text"
              value={valores.titulo}
              placeholder="Sobre o que é esse post?"
              /* Post recém-criado chega sem título e com o campo já focado:
                 "Criar" é um clique só, e escrever o nome é o gesto seguinte.
                 Em post que já tem nome não rouba o foco. */
              autoFocus={post.titulo.trim() === ""}
              onChange={(e) => mexer({ titulo: e.target.value })}
              onBlur={agora}
            />
          </label>

          <label className="conteudo-campo">
            <span>Perfil</span>
            <select
              value={valores.perfil}
              onChange={(e) => mexer({ perfil: e.target.value })}
              onBlur={agora}
            >
              {PERFIS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Formato</span>
            <select
              value={valores.formato ?? ""}
              onChange={(e) => mexer({ formato: e.target.value })}
              onBlur={agora}
            >
              <option value="">sem formato</option>
              {FORMATOS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Pilar</span>
            <select
              value={valores.pilar ?? ""}
              onChange={(e) => mexer({ pilar: e.target.value })}
              onBlur={agora}
            >
              <option value="">sem pilar</option>
              {PILARES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="conteudo-campo">
            <span>Status</span>
            <select
              value={valores.status}
              onChange={(e) => mexer({ status: e.target.value as Status })}
              onBlur={agora}
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_INFO[s].rotulo}
                </option>
              ))}
            </select>
          </label>

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

          <label className="conteudo-campo conteudo-campo-largo">
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
            <textarea
              rows={4}
              value={valores.legenda ?? ""}
              onChange={(e) => mexer({ legenda: e.target.value })}
              onBlur={agora}
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
            <textarea
              rows={2}
              value={valores.observacao ?? ""}
              onChange={(e) => mexer({ observacao: e.target.value })}
              onBlur={agora}
            />
          </label>
        </div>

        <div className="mt-4">
          <IndicadorSalvo estado={estado} hora={horaSalvo} />
        </div>
      </div>
    </>
  );
}

/* O indicador ocupa o lugar do botão que saiu. Sem ele, autosave vira fé. */
export function IndicadorSalvo({ estado, hora }: { estado: Estado; hora: string | null }) {
  const texto =
    estado === "salvando"
      ? "salvando..."
      : estado === "erro"
        ? "não salvou"
        : estado === "sujo"
          ? "alterações não salvas"
          : estado === "salvo"
            ? "salvo" + (hora ? " às " + hora : "")
            : "tudo salvo";

  return (
    <span className={"conteudo-salvo" + (estado === "erro" ? " conteudo-salvo-erro" : "")}>
      {texto}
    </span>
  );
}

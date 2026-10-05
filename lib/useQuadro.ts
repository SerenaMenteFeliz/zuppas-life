"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Agendado, Marcacao, NovoAgendado } from "./quadro-itens";

/* Estado do Quadro no navegador: lê a semana da API e, se pedido, relê de
   tempos em tempos (a TV) e quando a aba volta a ficar visível.

   Marcar é otimista: a marca muda na hora e a gravação vai por trás. Se a
   gravação falhar, a marca volta e o erro aparece, porque marca que some
   calada é o defeito que faz a família desconfiar da tela inteira. Agendar e
   desagendar esperam o banco e releem: são raros e o id vem de lá. */

export function useQuadro(inicio: string, fim: string, releituraSegundos?: number) {
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([]);
  const [agenda, setAgenda] = useState<Agendado[]>([]);
  /* Qual semana já chegou do banco. Trocar de semana volta a "carregando"
     sozinho, sem precisar zerar estado dentro do efeito. */
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /* Leitura que chega depois de uma marcação otimista não pode desfazê-la. */
  const pendentes = useRef(0);

  const ler = useCallback(async () => {
    try {
      const res = await fetch(`/api/quadro?inicio=${inicio}&fim=${fim}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const dados = (await res.json()) as { marcacoes: Marcacao[]; agenda: Agendado[] };
      if (pendentes.current === 0) setMarcacoes(dados.marcacoes);
      setAgenda(dados.agenda);
      setErro(null);
    } catch {
      setErro("Não consegui ler o quadro. Tentando de novo.");
    } finally {
      setCarregadoPara(`${inicio}|${fim}`);
    }
  }, [inicio, fim]);

  useEffect(() => {
    /* A primeira leitura sai por timer, como as seguintes: o efeito só
       assina fontes externas (relógio e visibilidade), e o estado muda no
       callback delas. */
    const primeira = setTimeout(() => void ler(), 0);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void ler();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    const id = releituraSegundos ? setInterval(() => void ler(), releituraSegundos * 1000) : null;
    return () => {
      clearTimeout(primeira);
      document.removeEventListener("visibilitychange", aoVoltar);
      if (id) clearInterval(id);
    };
  }, [ler, releituraSegundos]);

  const enviar = useCallback(async (corpo: object) => {
    const res = await fetch("/api/quadro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (!res.ok) {
      const resposta = (await res.json().catch(() => ({}))) as { erro?: string };
      throw new Error(resposta.erro ?? String(res.status));
    }
  }, []);

  const alternar = useCallback(
    async (m: Marcacao) => {
      const igual = (x: Marcacao) =>
        x.item === m.item && x.data === m.data && x.parte === m.parte && x.pessoa === m.pessoa;
      const existia = marcacoes.some(igual);
      setMarcacoes((atual) => (existia ? atual.filter((x) => !igual(x)) : [...atual, m]));
      pendentes.current += 1;
      try {
        await enviar({ acao: existia ? "desmarcar" : "marcar", marcacao: m });
        setErro(null);
      } catch (e) {
        setMarcacoes((atual) => (existia ? [...atual, m] : atual.filter((x) => !igual(x))));
        setErro(`Não gravou: ${e instanceof Error ? e.message : "erro"}. A marcação foi desfeita.`);
      } finally {
        pendentes.current -= 1;
      }
    },
    [marcacoes, enviar]
  );

  const agendar = useCallback(
    async (a: NovoAgendado): Promise<boolean> => {
      try {
        await enviar({ acao: "agendar", agendado: a });
        await ler();
        return true;
      } catch (e) {
        setErro(`Não agendou: ${e instanceof Error ? e.message : "erro"}.`);
        return false;
      }
    },
    [enviar, ler]
  );

  const desagendar = useCallback(
    async (id: string) => {
      try {
        await enviar({ acao: "desagendar", id });
        await ler();
      } catch (e) {
        setErro(`Não apagou: ${e instanceof Error ? e.message : "erro"}.`);
      }
    },
    [enviar, ler]
  );

  const carregado = carregadoPara === `${inicio}|${fim}`;
  return { marcacoes, agenda, carregado, erro, alternar, agendar, desagendar };
}

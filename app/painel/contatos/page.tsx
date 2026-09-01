import { Vazio } from "@/components/ui";
import ListaContatos from "@/components/painel/ListaContatos";
import PainelTopo from "@/components/painel/PainelTopo";
import { carregarContatos } from "@/lib/painel-contatos";

/* Aba Contatos (28/08/2026, a pedido do Yan: "tudo precisa estar lá").

   É a FONTE DE VERDADE das pessoas de todas as ofertas e projetos: quem fez o
   quiz, quem comprou na Biblioteca, quem gerou Pix do Método Cálice e quem
   está usando o app aparecem na mesma lista. A lógica de junção, o custo dela
   e as duas mutações (apagar e corrigir) estão em lib/painel-contatos.ts.

   **O topo saiu em 01/09/2026** (Yan: "não precisamos do que tá no print").
   Eram cinco cards de métrica, um card explicando por que dois deles eram
   separados, e uma faixa contando como a junção por e-mail funciona. Três
   motivos pra isso não voltar:

   1. Empurrava a lista pra baixo da dobra. A tela existe pra achar uma pessoa,
      e nenhuma pessoa aparecia sem rolar.
   2. Os números eram de painel, não de trabalho. "113 pessoas conhecidas" não
      muda nada que se faça aqui, e quem quer acompanhar funil tem a aba de
      Funis, que é onde métrica mora.
   3. Metade deles marcava zero por falta de instrumentação, não por falta de
      gente: em 01/09/2026 `lead_events` só tinha eventos `isca`, então "parou
      antes do Pix" e "gerou Pix e não pagou" mostravam 0 pra sempre. Card que
      não pode sair de zero ensina a ignorar a tela.

   A ressalva da junção por e-mail não se perdeu: ela virou o campo "Cadastro"
   na ficha de cada pessoa, que diz "só pedido da Biblioteca" exatamente para
   quem não tem linha em `contacts`. Quem precisa da informação vê no caso
   concreto, em vez de ler um aviso genérico toda vez que abre a aba. */

export const dynamic = "force-dynamic";

export default async function ContatosPage() {
  const { pessoas, problemas } = await carregarContatos();

  return (
    <>
      <PainelTopo titulo="Contatos" />

      <div className="painel-conteudo">
        {problemas.length > 0 && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-[0.74rem]"
            style={{ background: "rgba(200,120,60,.14)", color: "var(--ink)" }}
          >
            <p className="mb-1 font-medium">Nem toda fonte respondeu, então falta gente nesta lista:</p>
            <ul className="list-disc pl-5" style={{ color: "var(--ink-soft)" }}>
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {pessoas.length === 0 && problemas.length === 0 ? (
          <Vazio>
            Nenhuma pessoa no banco ainda. Quando a captura do quiz ou a primeira compra da
            Biblioteca acontecer, ela aparece aqui sozinha.
          </Vazio>
        ) : (
          <ListaContatos pessoas={pessoas} />
        )}
      </div>
    </>
  );
}

import { ImageResponse } from "next/og";

/* Ícone do app, desenhado em vez de guardado.

   Gerar o PNG a partir de JSX evita ter dois binários no repositório que
   ninguém sabe editar depois. A forma é o arco do Véu, a mesma linguagem do
   serena-app, com a inicial da casa.

   O conteúdo fica no miolo de propósito: o lançador do Android recorta o ícone
   em círculo, quadrado ou losango dependendo do fabricante, e só os 80%
   centrais estão garantidos. */

/* Locais, não exportados: um route handler só pode exportar os verbos HTTP e a
   configuração de rota. `size` e `contentType` exportados são a convenção dos
   arquivos de metadado (`icon.tsx`, `opengraph-image.tsx`), e aqui quebram a
   checagem de tipo da rota. */
const size = { width: 192, height: 192 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f5f1e8 0%, #e9eee4 100%)",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "56px 56px 16px 16px",
            background: "#5b7355",
            color: "#ffffff",
            fontSize: 62,
            fontWeight: 600,
          }}
        >
          Z
        </div>
      </div>
    ),
    size
  );
}

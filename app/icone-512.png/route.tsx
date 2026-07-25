import { ImageResponse } from "next/og";

/* Mesmo ícone em 512, que é o tamanho que o Android usa pra gerar as variações
   e o que o Chrome exige pra oferecer a instalação. Declarado também como
   `maskable` no manifesto, por isso a folga generosa em volta do desenho. */

const size = { width: 512, height: 512 };

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
            width: 288,
            height: 288,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "144px 144px 40px 40px",
            background: "#5b7355",
            color: "#ffffff",
            fontSize: 160,
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

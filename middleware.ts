import { NextRequest, NextResponse } from "next/server";
import { CASA_COOKIE } from "@/lib/casa-chave";

// Proteção mínima só pro painel interno (/painel — funis, automações; dado
// de negócio: leads, conversão, receita, disparo de e-mail — não é pra
// família ver). /funis vira redirect pra /painel/funis (01/08), mantido no
// matcher pra não expor nada durante o redirect. Resto do app (rotina) segue
// público, isso não muda. Sem auth de verdade ainda (Supabase Auth do
// zuppas-life é passo futuro) — enquanto isso, chave compartilhada via
// cookie. Ver [[credenciais]] no Vault Zuppas pro valor de ADMIN_KEY.
//
// 04/10/2026: /marcar (Quadro da semana) ganhou a sua própria chave, a
// CASA_KEY, no mesmo esquema. Quem marca a louça não precisa da chave que abre
// leads e receita. O /quadro (visualização da TV) segue aberto: a TV abre o
// site sozinha e não tem como digitar chave.
const COOKIE_ADMIN = "zl_admin";

function exigirChave(
  req: NextRequest,
  chave: string | undefined,
  cookie: string,
  dias: number
) {
  if (!chave) return NextResponse.next(); // sem env var (dev local), não bloqueia

  if (req.cookies.get(cookie)?.value === chave) {
    return NextResponse.next();
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("key");
  if (provided === chave) {
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(cookie, chave, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * dias,
    });
    return res;
  }

  return new NextResponse("Acesso restrito.", { status: 401 });
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/marcar")) {
    // A TV e o PC da sala ficam logados um ano: renovar chave em aparelho de
    // parede é o tipo de atrito que faz a família desistir da tela.
    return exigirChave(req, process.env.CASA_KEY, CASA_COOKIE, 365);
  }
  return exigirChave(req, process.env.ADMIN_KEY, COOKIE_ADMIN, 90);
}

export const config = {
  matcher: ["/painel/:path*", "/funis/:path*", "/marcar/:path*"],
};

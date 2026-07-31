import { NextRequest, NextResponse } from "next/server";

// Proteção mínima só pra /funis (dado de negócio: leads, conversão, receita
// — não é pra família ver). O resto do app (rotina) segue público, isso não
// muda hoje. Sem auth de verdade ainda (Supabase Auth do zuppas-life é passo
// futuro) — enquanto isso, chave compartilhada via cookie. Ver [[credenciais]]
// no Vault Zuppas pro valor de ADMIN_KEY.
const COOKIE_NAME = "zl_admin";

export function middleware(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return NextResponse.next(); // sem env var (dev local), não bloqueia

  if (req.cookies.get(COOKIE_NAME)?.value === adminKey) {
    return NextResponse.next();
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("key");
  if (provided === adminKey) {
    url.searchParams.delete("key");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, adminKey, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
    });
    return res;
  }

  return new NextResponse("Acesso restrito.", { status: 401 });
}

export const config = {
  matcher: ["/funis/:path*"],
};

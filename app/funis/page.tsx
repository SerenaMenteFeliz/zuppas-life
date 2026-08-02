import { redirect } from "next/navigation";

// Migrado pra dentro do painel com sidebar em 01/08 — ver app/painel/funis.
// Redirect em vez de apagar a rota: evita quebrar um bookmark antigo do Yan.
export default function FunisRedirect() {
  redirect("/painel/funis");
}

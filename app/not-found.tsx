import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="veil-bg flex min-h-screen items-center justify-center px-6">
      <div className="glass-card glass-card-strong max-w-sm p-7 text-center">
        <h1
          className="mb-2 text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Essa página não existe
        </h1>
        <p className="mb-5 text-sm" style={{ color: "var(--ink-soft)" }}>
          Deve ter sido um link antigo.
        </p>
        <Link href="/" className="botao inline-block">
          Voltar pro dia
        </Link>
      </div>
    </main>
  );
}

/* Ícones desenhados à mão, sem biblioteca.

   São seis traços; uma dependência de ícones custaria mais bytes que o app
   inteiro e traria um vocabulário visual que não é o da família. Todos herdam
   `currentColor` e o tamanho vem da classe, então servem em qualquer tema. */

type Props = { className?: string };

function base(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className ?? "h-5 w-5",
    "aria-hidden": true,
  };
}

export function Check({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")} strokeWidth={2.4}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function Sol({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function Semana({ className }: Props) {
  return (
    <svg {...base(className)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function Casa({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6 9.8V20h12V9.8" />
    </svg>
  );
}

export function Estrela({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 4.5l2.2 4.7 5 .7-3.6 3.6.9 5.1-4.5-2.5-4.5 2.5.9-5.1L4.8 9.9l5-.7z" />
    </svg>
  );
}

export function Tela({ className }: Props) {
  return (
    <svg {...base(className)}>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

export function Mais({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Lixeira({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 12.2h9.4L17.5 7" />
    </svg>
  );
}

export function Relogio({ className }: Props) {
  return (
    <svg {...base(className ?? "h-3.5 w-3.5")}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function Pular({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M5 6l7 6-7 6zM17 6v12" />
    </svg>
  );
}

export function Filtro({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M3.5 6h17M6.5 12h11M10 18h4" />
    </svg>
  );
}

export function Seta({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ── Ícones do dia ─────────────────────────────────────────────────────────
   Manhã, tarde e noite ganham forma própria porque o Yan pediu que a separação
   fosse visual, não só uma aba escrita. Um ícone é lido antes da palavra, que é
   exatamente o que se quer de quem abre o app com o café na outra mão. */

export function Manha({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 17h16M6.5 17a5.5 5.5 0 1111 0" />
      <path d="M12 4v2M4.6 8.6l1.4 1.4M19.4 8.6L18 10M2.5 21h19" />
    </svg>
  );
}

export function Tarde({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}

export function Noite({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M20 14.5A8.2 8.2 0 019.6 4 8.5 8.5 0 1020 14.5z" />
    </svg>
  );
}

/* ── Ícones de categoria ───────────────────────────────────────────────────
   "Fácil de entender o que é cada coisa" começa aqui: a linha diz o que é
   antes de alguém ler o rótulo. */

/** Faixa "a qualquer hora": o dia como uma onda, sem marcação de hora. */
export function Solto({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M3 14c2.2-3.4 4.4-3.4 6.6 0s4.4 3.4 6.6 0S20.8 10.6 21 10.6" />
      <path d="M3 8.5h4M17 8.5h4" opacity="0.45" />
    </svg>
  );
}

/** "Peguei essa": a mão que assume uma tarefa do mural. */
export function Mao({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L6 15.5l-.9-1.2a1.6 1.6 0 0 1 2.4-2.1L9 13.6V11" />
    </svg>
  );
}

export function Ancora({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2V20M6 12H4.2a7.8 7.8 0 0015.6 0H18M8.5 11h7" />
    </svg>
  );
}

export function Cachorro({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M5 5.5v4l-1.6 2.2A2 2 0 004.8 15H6v3.5h12V15h1.2a2 2 0 001.4-3.3L19 9.5v-4l-2.6 2H7.6z" />
      <path d="M10 12.5h.01M14 12.5h.01" />
    </svg>
  );
}

export function Vassoura({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M15.5 3.5L9 10M7.2 11.8l5-5 3.9 3.9-5 5z" />
      <path d="M6.2 12.8L3 21l8.2-3.2" />
    </svg>
  );
}

export function Mochila({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M6 9.5a6 6 0 1112 0V20H6z" />
      <path d="M9.5 7.5V5.2A2.5 2.5 0 0112 3a2.5 2.5 0 012.5 2.2v2.3M9 14h6" />
    </svg>
  );
}

export function Sino({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M6.5 10a5.5 5.5 0 1111 0v4.5l1.5 2.2H5l1.5-2.2z" />
      <path d="M10 19.5a2.2 2.2 0 004 0" />
    </svg>
  );
}

export function Coracao({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0112 8.5a3.9 3.9 0 017 2.3c0 4.8-7 9.2-7 9.2z" />
    </svg>
  );
}

export function Pasta({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M3.5 7.5h6l1.6 2h9.4V19H3.5z" />
    </svg>
  );
}

/* ── Ícones do painel interno ──────────────────────────────────────────── */

export function Funil({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 4.5h16L14 13v6l-4 2v-8z" />
    </svg>
  );
}

export function Raio({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M13 3L5 13.5h5.5L10 21l8-11h-5.5z" />
    </svg>
  );
}

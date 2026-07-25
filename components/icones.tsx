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

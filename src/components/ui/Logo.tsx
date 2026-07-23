interface LogoProps {
  size?: number;
  className?: string;
}

/** Disque en rotation + arcs sonores — marque de Rotation. `currentColor` pour s'adapter aux thèmes. */
export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="3" opacity="0.14" />
      <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="3" opacity="0.24" />
      <path d="M20 66 a40 40 0 0 1 80 0" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
      <path d="M29 66 a31 31 0 0 1 62 0" stroke="currentColor" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
      <path d="M38 66 a22 22 0 0 1 44 0" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M100 66 l14 -3 l-5 15 z" fill="currentColor" opacity="0.5" />
      <circle cx="60" cy="60" r="8" fill="currentColor" />
    </svg>
  );
}

// Drawn for this project: slightly uneven strokes so they sit with the highlighter, not a stock set.
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SpeakerIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9.2h3.1L12 5v14l-4.9-4.1H4z" />
      <path d="M15.4 9.1c1.2 1.5 1.2 4.3 0 5.8" />
      <path d="M18.1 6.6c2.5 3 2.6 7.8 0 10.9" />
    </svg>
  );
}

export function StopIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7.1 6.8c3.4-.3 6.6-.2 9.9.1.3 3.4.3 6.8 0 10.2-3.3.3-6.6.3-9.9 0-.3-3.4-.3-6.9 0-10.3z" />
    </svg>
  );
}

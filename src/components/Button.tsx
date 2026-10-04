type Variant = "primary" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-[4px] bg-ink px-6 py-3.5 text-[1.0625rem] font-semibold text-paper hover:bg-ink-hover disabled:opacity-50",
  quiet:
    "-mx-1 inline-flex items-center gap-2 rounded-[2px] px-1 py-1 text-[1.0625rem] text-ink underline decoration-ink-soft/40 decoration-2 underline-offset-[6px] hover:decoration-ink",
};

/** Class names for a button look, so links can share it. */
export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return `${VARIANT[variant]} ${extra}`.trim();
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className = "", type = "button", ...rest }: Props) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}

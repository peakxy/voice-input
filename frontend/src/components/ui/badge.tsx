import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "default" | "accent" | "success" | "warning" | "muted";

const variantClasses: Record<Variant, string> = {
  default: "border border-border bg-surface text-slate-300",
  accent: "border border-accent/40 bg-accentSoft text-accent",
  success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border border-amber-400/30 bg-amber-500/10 text-amber-300",
  muted: "border border-border bg-bg text-muted",
};

export function Badge({
  className,
  variant = "default",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...rest}
    />
  );
}

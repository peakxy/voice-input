import { type LabelHTMLAttributes } from "react";
import clsx from "clsx";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx("text-sm font-medium text-slate-300", className)}
      {...rest}
    />
  );
}

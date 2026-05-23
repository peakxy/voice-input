import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

import { ToastContext, type ToastApi, type ToastVariant } from "@/components/ui/toast-context";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
      info: (message: string) => show(message, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              "pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition",
              item.variant === "success" &&
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
              item.variant === "error" && "border-red-500/40 bg-red-500/10 text-red-200",
              item.variant === "info" && "border-border bg-surface/90 text-slate-200",
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

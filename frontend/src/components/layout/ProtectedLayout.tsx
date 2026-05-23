import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/auth";

export function ProtectedLayout() {
  const status = useAuthStore((state) => state.status);
  const token = useAuthStore((state) => state.token);
  const refreshMe = useAuthStore((state) => state.refreshMe);
  const location = useLocation();

  useEffect(() => {
    if (token && status === "authenticated") {
      void refreshMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        正在加载…
      </div>
    );
  }

  if (status === "unauthenticated" || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <AppShell />;
}

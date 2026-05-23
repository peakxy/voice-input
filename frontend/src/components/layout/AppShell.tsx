import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Mic, History as HistoryIcon, Tags } from "lucide-react";
import clsx from "clsx";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/components/ui/toast";

const navItems = [
  { to: "/", label: "录入", icon: Mic, end: true },
  { to: "/hotwords", label: "热词", icon: Tags, end: false },
  { to: "/history", label: "历史", icon: HistoryIcon, end: false },
];

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toast = useToast();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    toast.success("已退出登录");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Mic size={16} className="text-accent" />
              Voice Input
            </span>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
                      isActive
                        ? "bg-accentSoft text-accent"
                        : "text-slate-300 hover:bg-surface hover:text-slate-100",
                    )
                  }
                >
                  <item.icon size={14} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {user ? user.username : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={onLogout} aria-label="退出登录">
              <LogOut size={14} />
              退出
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

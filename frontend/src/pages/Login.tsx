import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-context";
import { extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const USERNAME_MIN = 3;
const USERNAME_MAX = 64;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const toast = useToast();

  const usernameError = username.length === 0
    ? null
    : username.length < USERNAME_MIN || username.length > USERNAME_MAX
      ? `用户名长度应为 ${USERNAME_MIN}-${USERNAME_MAX} 位`
      : null;
  const passwordError = password.length === 0
    ? null
    : password.length < PASSWORD_MIN || password.length > PASSWORD_MAX
      ? `密码长度应为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位`
      : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (usernameError || passwordError || !username || !password) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const user = await login({ username, password });
      toast.success(`欢迎回来，${user.username}`);
      navigate("/", { replace: true });
    } catch (err) {
      const message = extractErrorMessage(err, "登录失败");
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登录 Voice Input</CardTitle>
          <CardDescription>请输入注册时使用的用户名和密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={submitting}
                required
              />
              {usernameError && <p className="text-xs text-red-300">{usernameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={submitting}
                required
              />
              {passwordError && <p className="text-xs text-red-300">{passwordError}</p>}
            </div>
            {serverError && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !username || !password || !!usernameError || !!passwordError}
            >
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            还没有账号？
            <Link to="/register" className="ml-1 text-accent hover:underline">
              注册新账号
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

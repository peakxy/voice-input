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

export function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const register = useAuthStore((state) => state.register);
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
  const confirmError = confirm.length === 0
    ? null
    : confirm !== password
      ? "两次输入的密码不一致"
      : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (usernameError || passwordError || confirmError || !username || !password || !confirm) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const user = await register({ username, password });
      toast.success(`注册成功，欢迎 ${user.username}`);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(extractErrorMessage(err, "注册失败"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>注册新账号</CardTitle>
          <CardDescription>用户名 3-64 位，密码 8-128 位</CardDescription>
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
                autoComplete="new-password"
                disabled={submitting}
                required
              />
              {passwordError && <p className="text-xs text-red-300">{passwordError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">确认密码</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                required
              />
              {confirmError && <p className="text-xs text-red-300">{confirmError}</p>}
            </div>
            {serverError && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                submitting ||
                !username ||
                !password ||
                !confirm ||
                !!usernameError ||
                !!passwordError ||
                !!confirmError
              }
            >
              {submitting ? "注册中…" : "创建账号"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            已有账号？
            <Link to="/login" className="ml-1 text-accent hover:underline">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

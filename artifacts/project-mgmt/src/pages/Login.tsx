import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("请输入账户名和密码"); return; }
    setLoading(true);
    setError("");
    const err = await login(username, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">兆</div>
          <h1 className="text-2xl font-bold text-foreground">兆方美迪</h1>
          <p className="text-sm text-muted-foreground mt-1">项目管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-center">登录</h2>

          <div className="space-y-1.5">
            <Label>账户名</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入账户名"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>密码</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </div>
    </div>
  );
}

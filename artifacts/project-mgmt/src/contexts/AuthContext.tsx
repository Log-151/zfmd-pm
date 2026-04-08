import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthState {
  user: { username: string } | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  login: async () => "未初始化",
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.username ? data : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<string | null> => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) { setUser({ username: data.username }); return null; }
    return data.error ?? "登录失败";
  };

  const logout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

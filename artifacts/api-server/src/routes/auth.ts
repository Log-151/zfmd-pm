import { Router, type IRouter } from "express";

const router: IRouter = Router();

const ACCOUNTS: Record<string, string> = {
  ZFMD: "ZFMD",
};

router.post("/auth/login", (req, res): void => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password || ACCOUNTS[username.toUpperCase()] !== password) {
    res.status(401).json({ error: "用户名或密码错误" });
    return;
  }
  (req.session as any).user = { username: username.toUpperCase() };
  res.json({ ok: true, username: username.toUpperCase() });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/auth/me", (req, res): void => {
  const user = (req.session as any).user;
  if (!user) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  res.json({ username: user.username });
});

export default router;

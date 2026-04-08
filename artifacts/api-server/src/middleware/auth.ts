import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req.session as any)?.user;
  if (!user) {
    res.status(401).json({ error: "未登录" });
    return;
  }
  next();
}

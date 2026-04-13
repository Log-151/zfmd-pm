import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import authRouter from "./routes/auth";
import { logger } from "./lib/logger";
import { requireAuth } from "./middleware/auth";

const app: Express = express();

const isProd = process.env["NODE_ENV"] === "production";

// Trust the first proxy hop (Railway, nginx, Replit, etc.)
// Without this, Express sees HTTP from the load balancer and refuses to set secure cookies
if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store: PostgreSQL-backed so sessions survive server restarts and scale-out
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      conString: process.env["DATABASE_URL"],
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env["SESSION_SECRET"] || "zfmd-fallback-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: isProd,
    },
  }),
);

app.use("/api", authRouter);
// Health check must be public (no auth) for Railway/Replit deployment health probes
app.get("/api/healthz", (_req, res) => { res.json({ status: "ok" }); });
app.use("/api", requireAuth, router);

// Production: serve the built frontend SPA as a single unified server
if (isProd) {
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const frontendDist = join(__dirname, "..", "..", "project-mgmt", "dist", "public");

  app.use(express.static(frontendDist));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(frontendDist, "index.html"));
  });
}

// Global error handler — catches any unhandled errors from route handlers
// so the server stays up and returns a proper JSON 500 instead of crashing
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled route error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

export default app;

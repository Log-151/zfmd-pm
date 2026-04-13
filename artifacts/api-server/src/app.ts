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

// Health check MUST be first — before session middleware and auth
// so Railway / Replit health probes always get a 200 regardless of DB state
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

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

// Session store: prefer PostgreSQL-backed store for session persistence.
// Falls back to in-memory store when DATABASE_URL is not set.
let sessionStore: session.Store | undefined;
const dbUrl = process.env["DATABASE_URL"];
if (dbUrl) {
  try {
    const PgSession = connectPgSimple(session);
    sessionStore = new PgSession({
      conString: dbUrl,
      tableName: "user_sessions",
      createTableIfMissing: true,
    });
    logger.info("Using PostgreSQL session store");
  } catch (err) {
    logger.error({ err }, "Failed to init PostgreSQL session store — falling back to MemoryStore");
    sessionStore = undefined;
  }
} else {
  logger.warn("DATABASE_URL not set — using in-memory session store (sessions will not survive restarts)");
}

app.use(
  session({
    store: sessionStore,
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
app.use("/api", requireAuth, router);

// Production: serve the built frontend SPA as a single unified server
if (isProd) {
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const { existsSync } = await import("fs");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const frontendDist = join(__dirname, "..", "..", "project-mgmt", "dist", "public");
  const indexHtml = join(frontendDist, "index.html");

  logger.info(
    { frontendDist, distExists: existsSync(frontendDist), indexExists: existsSync(indexHtml) },
    "Frontend static files check"
  );

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
  }

  app.get(/^(?!\/api).*/, (_req, res, next) => {
    if (!existsSync(indexHtml)) {
      logger.error({ indexHtml }, "index.html not found — frontend was not built");
      res.status(503).send(
        "Frontend not built. Run: BASE_PATH=/ pnpm --filter @workspace/project-mgmt run build"
      );
      return;
    }
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
}

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isError = err instanceof Error;
  const rawMessage = isError ? err.message : String(err ?? "unknown");
  const message = rawMessage || `[${isError ? err.name : typeof err}] (no message)`;
  const code = (err as any)?.code as string | undefined;

  logger.error({ err, code }, "Unhandled route error");

  if (!res.headersSent) {
    res.status(500).json({ error: message, ...(isProd ? {} : { code }) });
  }
});

export default app;

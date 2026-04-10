import express, { type Express } from "express";
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

export default app;

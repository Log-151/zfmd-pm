import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
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

app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "zfmd-fallback-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      // Enable secure cookies in production (requires HTTPS)
      secure: isProd,
    },
  }),
);

app.use("/api", authRouter);
app.use("/api", requireAuth, router);

// Production: serve the built frontend SPA and act as a single unified server
if (isProd) {
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Dist is at: artifacts/api-server/dist/
  // Frontend built to: artifacts/project-mgmt/dist/public/
  const frontendDist = join(__dirname, "..", "..", "project-mgmt", "dist", "public");

  app.use(express.static(frontendDist));

  // SPA fallback — non-API routes serve index.html (client-side routing)
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(frontendDist, "index.html"));
  });
}

export default app;

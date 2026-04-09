import { Router, type IRouter, type Request, type Response } from "express";
import { URL } from "url";

const router: IRouter = Router();

const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|::1$|fc|fd|fe80)/i;

function isAllowedApiBase(apiBase: string): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(apiBase);
  } catch {
    return { ok: false, reason: "无效的 URL 格式" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "仅支持 HTTPS 协议的 API 地址" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "localhost" || hostname === "0.0.0.0") {
    return { ok: false, reason: "不允许访问 localhost 地址" };
  }

  if (PRIVATE_IP_RE.test(hostname)) {
    return { ok: false, reason: "不允许访问内网/私有 IP 地址" };
  }

  const allowedPorts = ["", "443", "80", "8080", "8443", "11434"];
  if (parsed.port && !allowedPorts.includes(parsed.port)) {
    return { ok: false, reason: `不允许使用端口 ${parsed.port}` };
  }

  return { ok: true };
}

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 32000;
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);

function validateMessages(messages: unknown): { ok: boolean; reason?: string } {
  if (!Array.isArray(messages)) {
    return { ok: false, reason: "messages 必须是数组" };
  }
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { ok: false, reason: `messages 数量须在 1-${MAX_MESSAGES} 之间` };
  }
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      return { ok: false, reason: "每条消息必须是对象" };
    }
    const m = msg as Record<string, unknown>;
    if (!ALLOWED_ROLES.has(String(m.role))) {
      return { ok: false, reason: `不支持的消息角色: ${m.role}` };
    }
    if (typeof m.content !== "string") {
      return { ok: false, reason: "消息内容必须是字符串" };
    }
    if (m.content.length > MAX_CONTENT_LENGTH) {
      return { ok: false, reason: `消息内容过长（最大 ${MAX_CONTENT_LENGTH} 字符）` };
    }
  }
  return { ok: true };
}

router.post("/ai/analyze", async (req: Request, res: Response): Promise<void> => {
  const { apiBase, apiKey, model, messages, stream: streamRequested } = req.body as {
    apiBase?: string;
    apiKey?: string;
    model?: string;
    messages?: unknown;
    stream?: boolean;
  };

  if (!apiBase || !apiKey || !model || messages === undefined) {
    res.status(400).json({ error: "缺少必要参数：apiBase, apiKey, model, messages" });
    return;
  }

  if (typeof model !== "string" || model.length > 200) {
    res.status(400).json({ error: "模型名称无效" });
    return;
  }

  const urlCheck = isAllowedApiBase(apiBase);
  if (!urlCheck.ok) {
    res.status(400).json({ error: `API 地址不合法: ${urlCheck.reason}` });
    return;
  }

  const msgCheck = validateMessages(messages);
  if (!msgCheck.ok) {
    res.status(400).json({ error: `消息格式错误: ${msgCheck.reason}` });
    return;
  }

  const safeMessages = (messages as { role: string; content: string }[]).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const useStream = streamRequested !== false;
  const baseUrl = apiBase.replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        stream: useStream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => upstream.statusText);
      res.status(upstream.status).json({ error: `LLM API 错误: ${upstream.status} ${errText.slice(0, 500)}` });
      return;
    }

    const upstreamContentType = upstream.headers.get("content-type") ?? "";

    if (upstreamContentType.includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }

      res.end();
    } else {
      const json = await upstream.json();
      res.setHeader("Content-Type", "application/json");
      res.json(json);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      res.status(504).json({ error: "请求超时（60秒），请检查 API 地址或网络" });
    } else {
      res.status(500).json({ error: `请求失败: ${err.message}` });
    }
  }
});

export { router as aiRouter };

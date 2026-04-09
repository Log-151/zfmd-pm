import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Send, Loader2, Bot, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "ai_config_v1";

interface AIConfig {
  apiBase: string;
  apiKey: string;
  model: string;
}

function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AIConfig;
  } catch {}
  return { apiBase: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o" };
}

function saveConfig(cfg: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/* ─── AI 配置弹窗 ─────────────────────────────────── */
interface AISettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (cfg: AIConfig) => void;
}

export function AISettingsDialog({ open, onClose, onSaved }: AISettingsDialogProps) {
  const [cfg, setCfg] = useState<AIConfig>(loadConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "err" | null>(null);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    if (open) {
      setCfg(loadConfig());
      setTestResult(null);
      setTestMsg("");
    }
  }, [open]);

  const handleSave = () => {
    saveConfig(cfg);
    onSaved(cfg);
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    try {
      const res = await fetch(`${BASE}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBase: cfg.apiBase,
          apiKey: cfg.apiKey,
          model: cfg.model,
          messages: [{ role: "user", content: "回复'连接成功'四个字即可" }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setTestResult("err");
        setTestMsg(err.error ?? "未知错误");
      } else {
        setTestResult("ok");
        setTestMsg("连接成功");
      }
    } catch (e: any) {
      setTestResult("err");
      setTestMsg(e.message ?? "网络错误");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bot className="w-4 h-4" />AI 配置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm">API Base URL</Label>
            <Input
              value={cfg.apiBase}
              onChange={e => setCfg(c => ({ ...c, apiBase: e.target.value }))}
              placeholder="https://api.openai.com/v1"
              className="h-9 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">支持 OpenAI 及兼容接口（如 DeepSeek、Kimi 等）</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">API Key</Label>
            <Input
              type="password"
              value={cfg.apiKey}
              onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="h-9 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">仅本地保存，不在服务端持久化（每次请求时由后端代理转发）</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">模型名称</Label>
            <Input
              value={cfg.model}
              onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}
              placeholder="gpt-4o"
              className="h-9 font-mono text-sm"
            />
          </div>
          {testResult && (
            <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${testResult === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {testResult === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testMsg}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !cfg.apiBase || !cfg.apiKey || !cfg.model}>
              {testing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              连接测试
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSave}>保存配置</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Markdown 简单渲染 ───────────────────────────── */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre key={i} className="bg-muted rounded p-3 text-xs overflow-auto my-2 whitespace-pre-wrap">
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-4 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>);
    } else if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\. /, "");
      elements.push(<li key={i} className="ml-4 list-decimal text-sm">{formatInline(content)}</li>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>);
    }
  }
  if (inCode && codeLines.length > 0) {
    elements.push(
      <pre key="last-code" className="bg-muted rounded p-3 text-xs overflow-auto my-2 whitespace-pre-wrap">
        {codeLines.join("\n")}
      </pre>
    );
  }
  return <div className="space-y-0.5">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

/* ─── AI 分析面板 ─────────────────────────────────── */
const QUICK_PROMPTS = [
  { label: "分析回款趋势", prompt: "请分析系统中的回款趋势，识别哪些月份回款较高/较低，有哪些规律或异常值？" },
  { label: "识别逾期风险", prompt: "请基于应收账款数据，识别当前存在哪些逾期风险，哪些账龄区间金额最大，有哪些改善建议？" },
  { label: "销售绩效对比", prompt: "请对比各销售经理的回款额与合同额，分析哪些销售表现突出，哪些需要关注？" },
  { label: "开票与回款差异", prompt: "请分析开票金额与回款金额之间的差异，当前应收未回款规模如何，有哪些趋势值得关注？" },
  { label: "合同执行评估", prompt: "请基于合同签约数据分析本年度合同执行情况，签约趋势、客户结构有哪些特点？" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAnalysisPanelProps {
  contextData: string;
  onOpenSettings: () => void;
}

export function AIAnalysisPanel({ contextData, onOpenSettings }: AIAnalysisPanelProps) {
  const [config] = useState<AIConfig>(loadConfig);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasConfig = config.apiBase && config.apiKey && config.model;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || streaming) return;

    const cfg = loadConfig();
    if (!cfg.apiBase || !cfg.apiKey || !cfg.model) {
      setError("请先配置 AI 参数");
      return;
    }

    setError("");
    setInput("");

    const userMsg: Message = { role: "user", content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    const systemPrompt = `你是一个专业的业务数据分析助手，擅长合同管理、回款跟踪、应收账款分析等领域。请用中文回答，语言简洁专业。

以下是当前系统的统计数据快照（供参考分析）：

${contextData}

请基于以上数据进行分析，如数据不足请说明。`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...newMessages.map(m => ({ role: m.role, content: m.content })),
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${BASE}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiBase: cfg.apiBase,
          apiKey: cfg.apiKey,
          model: cfg.model,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setMessages(prev => prev.slice(0, -1));
        setError(err.error ?? "请求失败");
        setStreaming(false);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (!contentType.includes("text/event-stream")) {
        const json = await res.json().catch(() => null);
        const text = json?.choices?.[0]?.message?.content ?? json?.content ?? JSON.stringify(json ?? "");
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      } else {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                assistantContent += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }

        if (!assistantContent) {
          setMessages(prev => prev.slice(0, -1));
          setError("AI 未返回有效内容，请检查模型配置");
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } else {
        setMessages(prev => prev.slice(0, -1));
        setError(err.message ?? "请求失败");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, contextData]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  if (!hasConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <Bot className="w-14 h-14 text-muted-foreground opacity-40" />
        <div>
          <p className="font-medium text-base">尚未配置 AI 接口</p>
          <p className="text-sm text-muted-foreground mt-1">配置 API Base URL、API Key 和模型名称后即可使用 AI 智能分析</p>
        </div>
        <Button onClick={onOpenSettings} className="gap-2">
          <Settings className="w-4 h-4" />配置 AI 接口
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-wrap gap-2 shrink-0">
        {QUICK_PROMPTS.map(qp => (
          <Button
            key={qp.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={streaming}
            onClick={() => sendMessage(qp.prompt)}
          >
            {qp.label}
          </Button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto rounded-lg border bg-muted/20 p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-8">
            <Bot className="w-10 h-10 opacity-30" />
            <p className="text-sm">点击上方快捷分析按钮，或在下方输入自定义问题</p>
            <p className="text-xs opacity-70">AI 将基于本年度统计数据快照进行分析（非实时筛选数据）</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${msg.role === "user" ? "bg-primary" : "bg-violet-500"}`}>
              {msg.role === "user" ? "我" : "AI"}
            </div>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm"}`}>
              {msg.role === "user" ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : msg.content ? (
                <SimpleMarkdown text={msg.content} />
              ) : (
                <span className="flex gap-1 items-center text-muted-foreground text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />思考中...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入自定义分析问题，如：分析今年合同签约的区域分布..."
          className="resize-none text-sm min-h-[72px] max-h-[120px]"
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          disabled={streaming}
        />
        <div className="flex flex-col gap-2">
          {streaming ? (
            <Button variant="outline" size="sm" onClick={handleStop} className="h-9">
              <RefreshCw className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => sendMessage(input)} disabled={!input.trim()} className="h-9">
              <Send className="w-4 h-4" />
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={streaming} className="h-9 text-xs text-muted-foreground">
              清空
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { loadConfig, type AIConfig };

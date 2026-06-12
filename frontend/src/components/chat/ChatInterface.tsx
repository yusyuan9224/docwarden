"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Shield, ChevronDown, ChevronUp, Search, Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { streamChat, type AgentStep, type ChatResult, type Citation } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content?: string;
  steps?: AgentStep[];
  result?: ChatResult;
  streaming?: boolean;
  currentSteps?: AgentStep[];
  error?: string;
}

interface ChatInterfaceProps {
  /** 管理後台版:可展開 observation 全文 */
  showObservations?: boolean;
  compact?: boolean;
}

function CitationCard({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(citation.score * 100);
  return (
    <div className="rounded-md border border-trust/25 bg-card text-xs overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-trust/5 transition-colors text-left gap-2"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] font-medium text-trust bg-trust/10 border border-trust/20 rounded-sm px-1 py-px shrink-0">
            {citation.ref}
          </span>
          <span className="font-medium text-foreground truncate">{citation.doc_name}</span>
          <span className="text-muted-foreground truncate hidden sm:inline">· {citation.source_name}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "font-mono tabular-nums",
              pct >= 80 ? "text-trust" : pct >= 60 ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {pct}%
          </span>
          {open ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-trust/15 bg-trust/5">
          <p className="text-muted-foreground leading-relaxed">{citation.text}</p>
        </div>
      )}
    </div>
  );
}

function StepItem({
  step,
  showObservations,
}: {
  step: AgentStep;
  showObservations?: boolean;
}) {
  const [obsOpen, setObsOpen] = useState(false);

  const icon =
    step.action === "search" ? (
      <Search className="w-3 h-3" />
    ) : step.action === "answer" ? (
      <CheckCircle2 className="w-3 h-3 text-primary" />
    ) : (
      <Shield className="w-3 h-3 text-trust" />
    );

  return (
    <div className="flex flex-col gap-0.5 animate-fade-slide-in">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="flex-1 min-w-0">
          {step.action === "search" && (
            <span>
              <span className="font-medium text-foreground/70">查詢</span>{" "}
              <span className="text-trust">{step.detail}</span>
            </span>
          )}
          {step.action === "answer" && (
            <span className="font-medium text-foreground/70">生成回答</span>
          )}
          {step.action === "refuse" && (
            <span className="font-medium text-foreground/70">判斷無足夠資料</span>
          )}
          {step.thought && (
            <span className="ml-1 italic text-muted-foreground/60">— {step.thought}</span>
          )}
        </span>
      </div>
      {showObservations && step.observation && (
        <div className="ml-5">
          <button
            onClick={() => setObsOpen((v) => !v)}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            {obsOpen ? "收起觀察" : "展開觀察"}
          </button>
          {obsOpen && (
            <pre className="mt-1 text-xs bg-muted rounded p-2 whitespace-pre-wrap text-muted-foreground overflow-x-auto max-h-40">
              {step.observation}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantMessage({
  msg,
  showObservations,
}: {
  msg: Message;
  showObservations?: boolean;
}) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const steps = msg.result?.steps ?? msg.currentSteps ?? [];

  if (msg.error) {
    return (
      <div className="flex gap-3 animate-fade-slide-in">
        <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
          <XCircle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-destructive bg-destructive/5 rounded-xl px-4 py-3">
            {msg.error}
          </p>
        </div>
      </div>
    );
  }

  if (msg.streaming && !msg.result) {
    return (
      <div className="flex gap-3 animate-fade-slide-in">
        <div className="w-7 h-7 rounded-lg bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="font-heading text-xs font-bold text-primary">W</span>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {steps.length > 0 && (
            <div className="space-y-1.5 bg-muted/30 rounded-xl px-4 py-3">
              {steps.map((s, i) => (
                <StepItem key={i} step={s} showObservations={showObservations} />
              ))}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              </div>
            </div>
          )}
          {steps.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="ml-1">思考中…</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const result = msg.result!;

  return (
    <div className="flex gap-3 animate-fade-slide-in">
      <div className="w-7 h-7 rounded-lg bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0 mt-0.5">
        <span className="font-heading text-xs font-bold text-primary">W</span>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {/* Steps summary toggle */}
        {steps.length > 0 && (
          <button
            onClick={() => setStepsOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {stepsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {stepsOpen ? "收起" : "展開"} {steps.length} 個推理步驟
          </button>
        )}
        {stepsOpen && steps.length > 0 && (
          <div className="space-y-1.5 bg-muted/30 rounded-xl px-4 py-3">
            {steps.map((s, i) => (
              <StepItem key={i} step={s} showObservations={showObservations} />
            ))}
          </div>
        )}

        {/* Refused state — 信任時刻,沉穩不警示 */}
        {result.refused ? (
          <div className="rounded-xl border border-trust/30 bg-card px-4 py-3.5 space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <Shield className="w-3.5 h-3.5 text-trust shrink-0" />
              <span className="font-mono text-[11px] font-medium tracking-widest text-trust">
                依據不足
              </span>
              <span className="text-xs text-muted-foreground ml-auto">誠實拒答</span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {result.answer ||
                "知識庫中沒有足夠的資料來回答此問題。我不會編造答案。"}
            </p>
            <p className="text-xs text-muted-foreground">
              這個問題已記錄為「未解問題」，可前往後台補充相關文件。
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>
        )}

        {/* Citations */}
        {result.citations.length > 0 && !result.refused && (
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] tracking-widest text-trust/80">引用來源</p>
            {result.citations.map((c, i) => (
              <CitationCard key={i} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatInterface({
  showObservations = false,
  compact = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      streaming: true,
      currentSteps: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      for await (const event of streamChat(q)) {
        if (event.type === "step") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, currentSteps: [...(m.currentSteps ?? []), event.data] }
                : m
            )
          );
        } else if (event.type === "result") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, result: event.data, currentSteps: undefined }
                : m
            )
          );
        } else if (event.type === "error") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, error: event.data.error }
                : m
            )
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, error: String(err) }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", compact ? "gap-0" : "gap-2")}>
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("space-y-5", compact ? "px-3 py-3" : "px-4 py-4")}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground/70">向知識庫提問</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {compact
                  ? "基於已上傳的文件回答，查不到會誠實告知"
                  : "基於已上傳的文件進行回答，若知識庫中無相關資料將誠實拒答"}
              </p>
            </div>
          )}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end animate-fade-slide-in">
                <div
                  className={cn(
                    "rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm max-w-[80%] leading-relaxed",
                    compact && "max-w-[85%]"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <AssistantMessage
                key={msg.id}
                msg={msg}
                showObservations={showObservations}
              />
            )
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={cn("border-t border-border bg-background", compact ? "px-3 py-2" : "px-4 py-3")}>
        <div className="flex items-end gap-2 bg-muted/40 rounded-xl border border-border/60 px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入問題… (Enter 送出)"
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground/60 max-h-28 leading-relaxed disabled:opacity-50"
            style={{ scrollbarWidth: "none" }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="h-7 w-7 shrink-0 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

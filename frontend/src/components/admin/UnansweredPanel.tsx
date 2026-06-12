"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUnanswered, resolveUnanswered, type UnansweredQuestion } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function QuestionRow({
  q,
  onResolved,
}: {
  q: UnansweredQuestion;
  onResolved: () => void;
}) {
  const [resolving, setResolving] = useState(false);

  const handle = async () => {
    setResolving(true);
    try {
      await resolveUnanswered(q.id);
      toast.success("已標記為已解決");
      onResolved();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-2.5 transition-colors",
        q.resolved ? "opacity-55" : "hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
          q.resolved ? "bg-primary/60" : "bg-amber-500/80"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{q.question}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
          {new Date(q.created_at).toLocaleString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="shrink-0">
        {q.resolved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
            <CheckCircle2 className="w-3 h-3" />
            已解決
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handle}
            disabled={resolving}
            className="h-7 text-xs gap-1.5"
          >
            {resolving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            標記已解決
          </Button>
        )}
      </div>
    </div>
  );
}

export default function UnansweredPanel() {
  const [questions, setQuestions] = useState<UnansweredQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUnanswered();
      setQuestions(data);
    } catch {
      toast.error("無法載入未解問題");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { startTransition(() => { load(); }); }, [load]);

  const pending = questions.filter((q) => !q.resolved);
  const resolved = questions.filter((q) => q.resolved);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">未解問題</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            這些是 agent 無法從知識庫找到答案的問題 — 這是補充文件的線索
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5 shrink-0">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          重新整理
        </Button>
      </div>

      {/* Insight strip */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium">
            有 <span className="font-mono tabular-nums text-primary">{pending.length}</span> 個問題待處理
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            針對這些問題補充相關文件，可以提升 DocWarden 的回答覆蓋率。
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-lg border border-dashed border-border">
          <div className="w-12 h-12 rounded-lg bg-primary/8 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary/70" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">目前沒有未解問題</p>
          <p className="text-xs text-muted-foreground/70">知識庫目前運作良好</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-muted-foreground tracking-widest">
                待處理 ({pending.length})
              </p>
              <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                {pending.map((q) => (
                  <QuestionRow key={q.id} q={q} onResolved={load} />
                ))}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[11px] text-muted-foreground tracking-widest">
                已解決 ({resolved.length})
              </p>
              <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                {resolved.map((q) => (
                  <QuestionRow key={q.id} q={q} onResolved={load} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

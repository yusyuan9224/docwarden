"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import { CheckCircle2, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        "flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all",
        q.resolved
          ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/50 opacity-60"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <HelpCircle
        className={cn(
          "w-4 h-4 mt-0.5 shrink-0",
          q.resolved ? "text-emerald-500" : "text-amber-500"
        )}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm leading-relaxed">{q.question}</p>
        <p className="text-xs text-muted-foreground">
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
          <Badge
            variant="secondary"
            className="text-xs gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            <CheckCircle2 className="w-3 h-3" />
            已解決
          </Badge>
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

      {/* Insight card */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/50 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            💡 有 {pending.length} 個問題待處理
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            針對這些問題補充相關文件，可以提升 DocWarden 的回答覆蓋率。
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">目前沒有未解問題</p>
          <p className="text-xs text-muted-foreground/70">知識庫目前運作良好！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                待處理 ({pending.length})
              </p>
              {pending.map((q) => (
                <QuestionRow key={q.id} q={q} onResolved={load} />
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                已解決 ({resolved.length})
              </p>
              {resolved.map((q) => (
                <QuestionRow key={q.id} q={q} onResolved={load} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

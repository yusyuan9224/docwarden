"use client";

import { useEffect, useState, startTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { getHealth, type HealthStatus } from "@/lib/api";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function HealthBadge() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    setLoading(true);
    setError(false);
    try {
      const h = await getHealth();
      setHealth(h);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => { check(); });
    const t = setInterval(() => startTransition(() => { check(); }), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <Badge variant="secondary" className="gap-1.5 text-xs animate-pulse">
        <RefreshCw className="w-3 h-3 animate-spin" />
        連線中
      </Badge>
    );
  }

  if (error || !health) {
    return (
      <button onClick={check} title="點擊重試">
        <Badge variant="destructive" className="gap-1.5 text-xs cursor-pointer">
          <WifiOff className="w-3 h-3" />
          後端離線
        </Badge>
      </button>
    );
  }

  const ok = health.status === "ok" && health.ollama;

  return (
    <button onClick={check} title={`模型: ${health.models.join(", ") || "無"}`}>
      <Badge
        variant="secondary"
        className={`gap-1.5 text-xs cursor-pointer transition-colors ${
          ok
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
        />
        <Wifi className="w-3 h-3" />
        {ok ? `正常 · ${health.models.length} 個模型` : "Ollama 未就緒"}
      </Badge>
    </button>
  );
}

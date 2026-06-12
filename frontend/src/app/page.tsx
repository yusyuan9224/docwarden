"use client";

import { useState } from "react";
import { Database, MessageSquare, HelpCircle, Shield } from "lucide-react";
import HealthBadge from "@/components/admin/HealthBadge";
import EmbedDialog from "@/components/admin/EmbedDialog";
import SourcesPanel from "@/components/admin/SourcesPanel";
import UnansweredPanel from "@/components/admin/UnansweredPanel";
import ChatInterface from "@/components/chat/ChatInterface";
import { cn } from "@/lib/utils";

type Tab = "sources" | "chat" | "unanswered";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "sources", label: "知識來源", icon: <Database className="w-4 h-4" /> },
  { id: "chat", label: "測試對話", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "unanswered", label: "未解問題", icon: <HelpCircle className="w-4 h-4" /> },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("sources");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-sm tracking-tight">DocWarden</span>
              <span className="text-xs text-muted-foreground">管理後台</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthBadge />
            <EmbedDialog />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col flex-1">
        {/* Tab nav */}
        <nav className="flex gap-1 py-3 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <main className="flex-1 py-6">
          {tab === "sources" && <SourcesPanel />}
          {tab === "unanswered" && <UnansweredPanel />}
          {tab === "chat" && (
            <div className="flex flex-col h-[calc(100vh-200px)] min-h-[480px]">
              <div className="mb-4">
                <h2 className="text-base font-semibold">測試對話</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  以訪客角度測試知識庫問答效果；可展開每步的推理與觀察
                </p>
              </div>
              <div className="flex-1 min-h-0 rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                <ChatInterface showObservations={true} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

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

  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — 墨綠檔案室 */}
      <aside className="sticky top-0 h-screen w-14 sm:w-52 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 sm:px-4 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-sidebar-accent ring-1 ring-sidebar-border flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-sidebar-accent-foreground" />
          </div>
          <div className="hidden sm:flex flex-col leading-none min-w-0">
            <span className="font-heading font-semibold text-sm tracking-tight text-sidebar-accent-foreground">
              DocWarden
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 mt-0.5">
              文件守衛 · 管理後台
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                tab === t.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="hidden sm:inline truncate">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer note */}
        <div className="mt-auto hidden sm:block px-4 py-3 border-t border-sidebar-border">
          <p className="text-[10px] leading-relaxed text-sidebar-foreground/50">
            本地運行 · 誠實回答
            <br />
            查無依據時不會編造答案
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
            <h1 className="text-sm font-semibold tracking-tight">
              {active?.label}
            </h1>
            <div className="flex items-center gap-2">
              <HealthBadge />
              <EmbedDialog />
            </div>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-4xl w-full">
          {tab === "sources" && <SourcesPanel />}
          {tab === "unanswered" && <UnansweredPanel />}
          {tab === "chat" && (
            <div className="flex flex-col h-[calc(100vh-160px)] min-h-[480px]">
              <div className="mb-4">
                <h2 className="text-base font-semibold">測試對話</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  以訪客角度測試知識庫問答效果；可展開每步的推理與觀察
                </p>
              </div>
              <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-card">
                <ChatInterface showObservations={true} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { Shield } from "lucide-react";
import ChatInterface from "@/components/chat/ChatInterface";

export default function WidgetPage() {
  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Brand bar */}
      <header className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border bg-sidebar">
        <div className="w-6 h-6 rounded-md bg-sidebar-accent ring-1 ring-sidebar-border flex items-center justify-center shrink-0">
          <Shield className="w-3.5 h-3.5 text-sidebar-accent-foreground" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-heading text-xs font-semibold text-sidebar-accent-foreground tracking-tight">DocWarden</span>
          <span className="text-[10px] text-sidebar-foreground/60 mt-0.5">本地運行 · 誠實回答</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sidebar-ring animate-pulse" />
          <span className="text-[10px] text-sidebar-foreground/70">線上</span>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ChatInterface compact={true} showObservations={false} />
      </div>
    </div>
  );
}

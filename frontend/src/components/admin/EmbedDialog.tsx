"use client";

import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SNIPPET = `<iframe src="http://localhost:3000/widget" style="position:fixed;bottom:20px;right:20px;width:380px;height:560px;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:9999"></iframe>`;

export default function EmbedDialog() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2" />
        }
      >
        <Code2 className="w-4 h-4" />
        嵌入程式碼
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>嵌入聊天 Widget</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          將以下程式碼貼入任何網頁的{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;body&gt;</code>{" "}
          標籤內，即可顯示 DocWarden 聊天窗口。
        </p>
        <div className="relative rounded-lg bg-muted/60 border border-border overflow-hidden">
          <pre className="text-xs p-4 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
            {SNIPPET}
          </pre>
          <Button
            size="sm"
            variant="secondary"
            onClick={copy}
            className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                已複製
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                複製
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          確保 DocWarden 後端與前端服務皆在執行中。Widget 會以固定定位方式浮現於頁面右下角。
        </p>
      </DialogContent>
    </Dialog>
  );
}

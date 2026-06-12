"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import {
  Database,
  FileUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getSources,
  createSource,
  deleteSource,
  uploadDocument,
  type Source,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function UploadZone({
  sourceId,
  onUploaded,
}: {
  sourceId: string;
  onUploaded: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<{ name: string; chunks: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    const MAX = 20 * 1024 * 1024;
    if (file.size > MAX) {
      toast.error("檔案超過 20 MB 限制");
      return;
    }
    const allowed = [".pdf", ".txt", ".md"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("僅支援 .pdf / .txt / .md");
      return;
    }
    setUploading(true);
    setLastResult(null);
    try {
      const res = await uploadDocument(sourceId, file);
      setLastResult({ name: file.name, chunks: res.num_chunks });
      toast.success(`已切成 ${res.num_chunks} 塊`);
      onUploaded();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  return (
    <div className="mt-3 space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all select-none",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ""; }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">上傳並向量化中…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <FileUp className="w-5 h-5 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">
              拖放或點擊上傳 <span className="font-medium text-foreground/70">.pdf / .txt / .md</span>
            </p>
            <p className="text-xs text-muted-foreground/50">最大 20 MB</p>
          </div>
        )}
      </div>
      {lastResult && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate font-medium">{lastResult.name}</span>
          <span className="shrink-0">已切成 <strong>{lastResult.chunks}</strong> 塊</span>
        </div>
      )}
    </div>
  );
}

function SourceCard({
  source,
  onDeleted,
  onUploaded,
}: {
  source: Source;
  onDeleted: () => void;
  onUploaded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`確定刪除「${source.name}」？此操作不可復原。`)) return;
    setDeleting(true);
    try {
      await deleteSource(source.id);
      toast.success(`已刪除「${source.name}」`);
      onDeleted();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{source.name}</CardTitle>
              {source.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{source.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-40"
            title="刪除來源"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <FileText className="w-2.5 h-2.5" />
            {source.num_docs} 份文件
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {source.num_chunks.toLocaleString()} 塊
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(source.created_at).toLocaleDateString("zh-TW")}
          </span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-3 pb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileUp className="w-3.5 h-3.5" />
          上傳文件
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expanded && (
          <UploadZone sourceId={source.id} onUploaded={onUploaded} />
        )}
      </CardContent>
    </Card>
  );
}

export default function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getSources();
      setSources(data);
    } catch {
      toast.error("無法載入知識來源");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { startTransition(() => { load(); }); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createSource(name.trim(), description.trim());
      toast.success(`已建立「${name.trim()}」`);
      setName("");
      setDescription("");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">知識來源</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理文件庫，上傳 PDF / TXT / Markdown 建立知識索引
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "取消" : "新增來源"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/5 animate-fade-slide-in">
          <CardContent className="pt-5">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                  來源名稱 <span className="text-destructive">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：產品手冊"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/60"
                  required
                  maxLength={80}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                  描述（選填）
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="這個知識庫的用途說明"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/60"
                  maxLength={200}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={creating || !name.trim()} className="gap-1.5">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  建立
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Source list */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <Database className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">尚無知識來源</p>
          <p className="text-xs text-muted-foreground/70">點擊「新增來源」開始建立知識庫</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sources.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              onDeleted={load}
              onUploaded={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface HealthStatus {
  status: string;
  ollama: boolean;
  models: string[];
}

export interface Source {
  id: string;
  name: string;
  description: string;
  num_docs: number;
  num_chunks: number;
  created_at: string;
}

export interface Citation {
  ref: string;
  source_name: string;
  doc_name: string;
  text: string;
  score: number;
}

export interface AgentStep {
  step: number;
  thought: string;
  action: "search" | "answer" | "refuse";
  detail: string;
  observation: string;
}

export interface ChatResult {
  answer: string;
  refused: boolean;
  citations: Citation[];
  steps: AgentStep[];
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  created_at: string;
  resolved: boolean;
}

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function getSources(): Promise<Source[]> {
  const res = await fetch(`${API_BASE}/api/sources`);
  if (!res.ok) throw new Error("Failed to fetch sources");
  return res.json();
}

export async function createSource(
  name: string,
  description: string
): Promise<{ source_id: string }> {
  const res = await fetch(`${API_BASE}/api/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (res.status === 409) throw new Error("同名知識來源已存在");
  if (!res.ok) throw new Error("建立失敗");
  return res.json();
}

export async function deleteSource(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sources/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("刪除失敗");
}

export async function uploadDocument(
  sourceId: string,
  file: File
): Promise<{ document_id: string; num_chunks: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/sources/${sourceId}/documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("上傳失敗");
  return res.json();
}

export async function getUnanswered(): Promise<UnansweredQuestion[]> {
  const res = await fetch(`${API_BASE}/api/unanswered`);
  if (!res.ok) throw new Error("Failed to fetch unanswered");
  return res.json();
}

export async function resolveUnanswered(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/unanswered/${id}/resolve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("標記失敗");
}

export type StreamEvent =
  | { type: "step"; data: AgentStep }
  | { type: "result"; data: ChatResult }
  | { type: "error"; data: { error: string } };

export async function* streamChat(
  question: string
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("聊天請求失敗");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        try {
          const parsed = JSON.parse(raw);
          if (eventType === "step") {
            yield { type: "step", data: parsed as AgentStep };
          } else if (eventType === "result") {
            yield { type: "result", data: parsed as ChatResult };
          } else if (eventType === "error") {
            yield { type: "error", data: parsed as { error: string } };
          }
        } catch {
          // skip malformed
        }
        eventType = "";
      }
    }
  }
}

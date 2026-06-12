"""FastAPI:來源/文件管理、聊天(SSE 串流 agent 步驟)、未解問題後台。

/api/chat 開放跨域(widget 會被嵌在任意網站);管理端點僅允許 dashboard 來源。
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

import fitz  # PyMuPDF
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .agent import run_agent
from .config import settings
from .kb import KnowledgeBase
from .ollama_client import OllamaClient
from .store import Store

MAX_UPLOAD_BYTES = 20 * 1024 * 1024

store = Store(settings.db_path)
kb: KnowledgeBase | None = None


def get_kb() -> KnowledgeBase:
    global kb
    if kb is None:
        kb = KnowledgeBase(qdrant_url=settings.qdrant_url)
    return kb


@asynccontextmanager
async def lifespan(app: FastAPI):
    await store.init()
    yield


app = FastAPI(title="DocWarden API", version="0.3.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.widget_allow_origins == "*" else settings.widget_allow_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    ollama = OllamaClient(timeout=5)
    try:
        resp = await ollama._client.get("/api/tags")
        resp.raise_for_status()
        models = [m["name"] for m in resp.json().get("models", [])]
        return {"status": "ok", "ollama": True, "models": models}
    except Exception:  # noqa: BLE001
        return {"status": "degraded", "ollama": False, "models": []}
    finally:
        await ollama.aclose()


# ---- sources & documents ----


class SourceIn(BaseModel):
    name: str
    description: str = ""


@app.post("/api/sources")
async def create_source(payload: SourceIn) -> dict:
    if not payload.name.strip():
        raise HTTPException(422, "name 不可為空")
    try:
        sid = await store.create_source(payload.name.strip(), payload.description.strip())
    except Exception:  # noqa: BLE001 (UNIQUE constraint)
        raise HTTPException(409, "同名來源已存在") from None
    return {"source_id": sid}


@app.get("/api/sources")
async def list_sources() -> list[dict]:
    return await store.list_sources()


@app.delete("/api/sources/{source_id}")
async def delete_source(source_id: str) -> dict:
    if await store.get_source(source_id) is None:
        raise HTTPException(404, "找不到來源")
    get_kb().delete_source(source_id)
    await store.delete_source(source_id)
    return {"ok": True}


@app.post("/api/sources/{source_id}/documents")
async def upload_document(source_id: str, file: UploadFile = File(...)) -> dict:
    if await store.get_source(source_id) is None:
        raise HTTPException(404, "找不到來源")
    name = file.filename or "document"
    suffix = Path(name).suffix.lower()
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "檔案超過 20MB")
    if suffix == ".pdf":
        with fitz.open(stream=data, filetype="pdf") as doc:
            text = "".join(page.get_text("text") for page in doc)
    elif suffix in {".txt", ".md"}:
        text = data.decode("utf-8")
    else:
        raise HTTPException(415, f"不支援的格式 {suffix}(支援 .pdf/.txt/.md)")
    if not text.strip():
        raise HTTPException(422, "文件沒有可抽取的文字")

    ollama = OllamaClient()
    try:
        num_chunks = await get_kb().ingest(ollama, source_id, name, text)
    finally:
        await ollama.aclose()
    doc_id = await store.add_document(source_id, name, num_chunks)
    return {"document_id": doc_id, "num_chunks": num_chunks}


# ---- chat ----


class ChatIn(BaseModel):
    question: str


@app.post("/api/chat")
async def chat(payload: ChatIn) -> StreamingResponse:
    """SSE:逐步推送 agent step,最後推 result。"""
    question = payload.question.strip()
    if not question:
        raise HTTPException(422, "question 不可為空")
    sources = await store.list_sources()

    async def stream():
        import asyncio  # noqa: PLC0415

        queue: asyncio.Queue = asyncio.Queue()
        ollama = OllamaClient()

        async def work():
            try:
                result = await run_agent(
                    question,
                    [{"id": s["id"], "name": s["name"], "description": s["description"]} for s in sources],
                    get_kb(),
                    ollama,
                    progress=lambda step: queue.put_nowait(("step", step.model_dump_json())),
                )
                if result.refused:
                    await store.log_unanswered(question)
                await queue.put(("result", result.model_dump_json()))
            except Exception as exc:  # noqa: BLE001
                await queue.put(("error", json.dumps({"error": str(exc)}, ensure_ascii=False)))
            finally:
                await ollama.aclose()
                await queue.put(None)

        task = asyncio.ensure_future(work())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                event, data = item
                yield f"event: {event}\ndata: {data}\n\n"
        finally:
            task.cancel()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---- unanswered(後台) ----


@app.get("/api/unanswered")
async def list_unanswered() -> list[dict]:
    return await store.list_unanswered()


@app.post("/api/unanswered/{uid}/resolve")
async def resolve_unanswered(uid: str) -> dict:
    await store.resolve_unanswered(uid)
    return {"ok": True}

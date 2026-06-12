"""CLI:快速試用 agent(不開 web)。

docwarden ask "問題" --docs ./docs_dir
"""

import asyncio
from pathlib import Path

import typer

from .agent import run_agent
from .config import settings
from .kb import KnowledgeBase
from .ollama_client import OllamaClient

app = typer.Typer(help="DocWarden — 誠實拒答的本地知識庫機器人", no_args_is_help=True)


@app.callback()
def _root() -> None:
    """強制子指令模式。"""


@app.command()
def ask(
    question: str = typer.Argument(..., help="要問的問題"),
    docs: Path = typer.Option(..., exists=True, help="知識庫文件資料夾(.txt/.md)"),
) -> None:
    """臨時建庫並提問(in-memory,跑完即丟)。"""

    async def go():
        ollama = OllamaClient()
        kb = KnowledgeBase(qdrant_url=None)
        try:
            files = sorted(docs.glob("*.txt")) + sorted(docs.glob("*.md"))
            for f in files:
                n = await kb.ingest(ollama, "cli", f.name, f.read_text(encoding="utf-8"))
                typer.echo(f"  · {f.name}:{n} chunks")
            sources = [{"id": "cli", "name": "文件", "description": "CLI 載入的知識庫"}]
            return await run_agent(question, sources, kb, ollama,
                                   progress=lambda s: typer.echo(f"  [{s.step}] {s.action} {s.detail}"))
        finally:
            await ollama.aclose()

    result = asyncio.run(go())
    typer.echo(f"\n{'🛡️ (拒答)' if result.refused else '💬'} {result.answer}")
    for c in result.citations:
        typer.echo(f"  └ 引用【{c.ref}】{c.doc_name}(相似度 {c.score})")


@app.command()
def doctor() -> None:
    """檢查 Ollama 與模型。"""
    import httpx

    try:
        resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=5)
        resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        typer.echo(f"✗ 無法連線 Ollama:{exc}")
        raise typer.Exit(1) from None
    names = {m["name"].split(":")[0] for m in resp.json().get("models", [])}
    for model in (settings.llm_model, settings.embed_model):
        mark = "✓" if model.split(":")[0] in names else "✗"
        typer.echo(f"{mark} {model}")

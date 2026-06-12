"""資料模型。LLM* 開頭者為 structured output schema(欄位必填,防 7B 偷懶)。

設計說明:agent 的「行動」不用 Ollama 原生 tool calling
(qwen2.5:7b 有未解 bug,見 ollama/ollama#7445 會捏造工具結果),
改用已驗證可靠的 JSON schema 結構化輸出表達行動決策 — 行為可測試、可解釋。
"""

from typing import Literal

from pydantic import BaseModel, Field

Action = Literal["search", "answer", "refuse"]


class LLMDecision(BaseModel):
    """agent 每一步的決策。"""

    thought: str = Field(description="這一步的推理,30 字內")
    action: Action = Field(description="search=查知識庫 / answer=已有足夠資料可回答 / refuse=查無資料誠實拒答")
    search_source: str = Field(description="action=search 時:要查的來源名稱,必須是清單中的名稱;否則填空字串")
    search_query: str = Field(description="action=search 時:檢索查詢語句;否則填空字串")
    answer: str = Field(description="action=answer 時:給使用者的完整回答;否則填空字串")
    citations: list[int] = Field(description="action=answer 時:引用的資料編號(觀察結果中的【資料 N】);否則空陣列")


class Citation(BaseModel):
    ref: int
    source_name: str
    doc_name: str
    text: str
    score: float


class AgentStep(BaseModel):
    step: int
    thought: str
    action: Action
    detail: str  # search: 「來源/查詢」;answer/refuse: 摘要
    observation: str | None = None  # search 的結果摘要


class ChatResult(BaseModel):
    answer: str
    refused: bool
    citations: list[Citation]
    steps: list[AgentStep]


class SourceOut(BaseModel):
    id: str
    name: str
    description: str
    num_docs: int
    num_chunks: int

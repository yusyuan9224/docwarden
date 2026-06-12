"""Agentic RAG 迴圈:structured output 決策(search / answer / refuse)。

拒答雙層設計:
- Layer 1(硬):檢索最高分低於門檻 → 該次觀察直接標記「查無足夠相關資料」
- Layer 2(軟):system prompt 的拒答規則 + refuse 行動;達到步數上限也強制拒答
每一步的 thought / action / observation 全程記錄,前端可展示 agent 推理過程。
"""

from collections.abc import Callable

from .config import settings
from .kb import KnowledgeBase, SearchHit
from .ollama_client import OllamaClient, StructuredOutputError
from .schemas import AgentStep, ChatResult, Citation, LLMDecision

SYSTEM_TEMPLATE = """\
你是 DocWarden,一個誠實的知識庫問答 agent。你「只」根據知識庫檢索到的資料回答。

可用的知識庫來源:
{sources}

每一步你輸出一個 JSON 決策:
- action=search:指定 search_source(必須是上面清單中的名稱)與 search_query,系統會回傳檢索結果
- action=answer:資料足夠時,寫出完整回答(與問題同語言),citations 填你引用的【資料 N】編號
- action=refuse:檢索結果不足以回答時,誠實拒答

鐵則:
1. 回答的每個事實都必須來自檢索結果,禁止使用你自己的知識補充
2. 檢索結果顯示「查無足夠相關資料」或內容與問題無關 → 換個查詢或來源再試,仍查不到就 refuse
3. 寧可拒答,不可編造。拒答不是失敗,編造才是
4. 同一個查詢不要重複搜尋"""

REFUSAL_TEXT = "根據目前知識庫中的資料,我無法回答這個問題。"


async def run_agent(
    question: str,
    sources: list[dict],  # [{id, name, description}]
    kb: KnowledgeBase,
    ollama: OllamaClient,
    progress: Callable[[AgentStep], None] | None = None,
) -> ChatResult:
    source_list = "\n".join(f"- {s['name']}:{s['description']}" for s in sources) or "-(尚無來源)"
    by_name = {s["name"]: s["id"] for s in sources}
    system = SYSTEM_TEMPLATE.format(sources=source_list)

    messages_log: list[str] = [f"使用者問題:{question}"]
    steps: list[AgentStep] = []
    citations: list[Citation] = []
    searched: set[tuple[str, str]] = set()

    def emit(step: AgentStep) -> None:
        steps.append(step)
        if progress:
            progress(step)

    for step_no in range(1, settings.max_agent_steps + 1):
        try:
            decision = await ollama.generate_structured(
                system, "\n\n".join(messages_log), LLMDecision
            )
        except StructuredOutputError:
            emit(AgentStep(step=step_no, thought="決策輸出失敗", action="refuse", detail="結構化輸出重試耗盡"))
            return ChatResult(answer=REFUSAL_TEXT, refused=True, citations=[], steps=steps)

        if decision.action == "answer" and decision.answer.strip():
            cited = [c for c in citations if c.ref in set(decision.citations)]
            emit(AgentStep(step=step_no, thought=decision.thought, action="answer",
                           detail=f"引用 {len(cited)} 筆資料"))
            # 沒有任何引用的回答視同無根據 → 拒答(防幻覺最後防線)
            if not cited:
                emit(AgentStep(step=step_no, thought="回答未引用任何檢索資料,駁回", action="refuse",
                               detail="無引用依據"))
                return ChatResult(answer=REFUSAL_TEXT, refused=True, citations=[], steps=steps)
            return ChatResult(answer=decision.answer.strip(), refused=False, citations=cited, steps=steps)

        if decision.action == "refuse":
            emit(AgentStep(step=step_no, thought=decision.thought, action="refuse", detail="agent 判斷查無資料"))
            return ChatResult(answer=REFUSAL_TEXT, refused=True, citations=[], steps=steps)

        # action == search
        source_name = decision.search_source.strip()
        query = decision.search_query.strip() or question
        source_id = by_name.get(source_name)  # 名稱不在清單 → 全庫搜尋
        key = (source_name, query)
        if key in searched:
            observation = "(重複的查詢,已略過;請改用其他查詢、來源,或做出 answer/refuse 決策)"
        else:
            searched.add(key)
            hits = await kb.search(ollama, query, source_id=source_id)
            observation = _observe(hits, citations, source_name or "全部來源")
        emit(AgentStep(step=step_no, thought=decision.thought, action="search",
                       detail=f"{source_name or '全部來源'}|{query}", observation=observation[:400]))
        messages_log.append(f"第 {step_no} 步 search({source_name or '全部'} / {query})結果:\n{observation}")

    emit(AgentStep(step=settings.max_agent_steps + 1, thought="達步數上限", action="refuse", detail="超過最大步數"))
    return ChatResult(answer=REFUSAL_TEXT, refused=True, citations=citations, steps=steps)


def _observe(hits: list[SearchHit], citations: list[Citation], source_label: str) -> str:
    """把檢索結果轉成觀察文字;Layer 1 門檻在這裡生效。"""
    qualified = [h for h in hits if h.score >= settings.refusal_score_threshold]
    if not qualified:
        best = f"(最高相似度 {hits[0].score:.2f},低於門檻 {settings.refusal_score_threshold})" if hits else ""
        return f"查無足夠相關資料 {best}"
    lines = []
    for h in qualified:
        ref = len(citations) + 1
        citations.append(
            Citation(ref=ref, source_name=source_label, doc_name=h.doc_name, text=h.text, score=round(h.score, 3))
        )
        lines.append(f"【資料 {ref}】(出自 {h.doc_name},相似度 {h.score:.2f})\n{h.text}")
    return "\n\n".join(lines)

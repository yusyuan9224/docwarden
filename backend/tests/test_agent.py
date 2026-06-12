"""agent 迴圈測試:用假 ollama / kb 驗證決策路徑與防幻覺防線。"""


from docwarden.agent import REFUSAL_TEXT, run_agent
from docwarden.kb import SearchHit
from docwarden.schemas import LLMDecision

SOURCES = [{"id": "s1", "name": "產品文件", "description": "產品說明"}]


class FakeOllama:
    """依序回傳預先排好的決策。"""

    def __init__(self, decisions: list[LLMDecision]):
        self.decisions = list(decisions)
        self.calls = 0

    async def generate_structured(self, system, user, schema):
        self.calls += 1
        return self.decisions.pop(0)

    async def embed(self, texts):
        return [[0.0] * 4 for _ in texts]


class FakeKB:
    def __init__(self, hits: list[SearchHit]):
        self.hits = hits
        self.queries: list[tuple] = []

    async def search(self, ollama, query, source_id=None, top_k=None):
        self.queries.append((query, source_id))
        return self.hits


def d(**kw) -> LLMDecision:
    base = dict(thought="t", action="search", search_source="", search_query="", answer="", citations=[])
    base.update(kw)
    return LLMDecision(**base)


GOOD_HIT = SearchHit(text="USB-C 緊急供電孔可臨時供電", score=0.82, doc_name="說明.txt", source_id="s1")
LOW_HIT = SearchHit(text="無關內容", score=0.31, doc_name="說明.txt", source_id="s1")


async def test_search_then_answer_with_citation():
    ollama = FakeOllama([
        d(action="search", search_source="產品文件", search_query="電池沒電"),
        d(action="answer", answer="可用 USB-C 供電孔。", citations=[1]),
    ])
    result = await run_agent("電池沒電怎麼辦?", SOURCES, FakeKB([GOOD_HIT]), ollama)
    assert not result.refused
    assert result.citations[0].ref == 1
    assert "USB-C" in result.citations[0].text
    assert [s.action for s in result.steps] == ["search", "answer"]


async def test_low_score_observation_marks_no_data():
    ollama = FakeOllama([
        d(action="search", search_source="產品文件", search_query="x"),
        d(action="refuse"),
    ])
    result = await run_agent("毫無關係的問題", SOURCES, FakeKB([LOW_HIT]), ollama)
    assert result.refused
    assert result.answer == REFUSAL_TEXT
    assert "查無足夠相關資料" in (result.steps[0].observation or "")


async def test_answer_without_citations_is_rejected():
    ollama = FakeOllama([
        d(action="search", search_source="產品文件", search_query="q"),
        d(action="answer", answer="我憑印象覺得是這樣。", citations=[]),
    ])
    result = await run_agent("問題", SOURCES, FakeKB([GOOD_HIT]), ollama)
    assert result.refused  # 無引用 → 防幻覺防線駁回


async def test_repeated_query_skipped():
    ollama = FakeOllama([
        d(action="search", search_source="產品文件", search_query="同樣的話"),
        d(action="search", search_source="產品文件", search_query="同樣的話"),
        d(action="refuse"),
    ])
    kb = FakeKB([LOW_HIT])
    result = await run_agent("問題", SOURCES, kb, ollama)
    assert result.refused
    assert len(kb.queries) == 1  # 第二次重複查詢被略過
    assert "重複的查詢" in (result.steps[1].observation or "")


async def test_max_steps_forces_refusal():
    ollama = FakeOllama([
        d(action="search", search_source="產品文件", search_query=f"q{i}") for i in range(10)
    ])
    result = await run_agent("問題", SOURCES, FakeKB([LOW_HIT]), ollama)
    assert result.refused
    assert result.steps[-1].action == "refuse"


async def test_unknown_source_falls_back_to_global_search():
    ollama = FakeOllama([
        d(action="search", search_source="不存在的來源", search_query="q"),
        d(action="answer", answer="answer", citations=[1]),
    ])
    kb = FakeKB([GOOD_HIT])
    result = await run_agent("問題", SOURCES, kb, ollama)
    assert kb.queries[0][1] is None  # source_id=None → 全庫搜尋
    assert not result.refused

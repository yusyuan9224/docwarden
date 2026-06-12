# 貢獻指南 / Contributing

感謝你考慮為 DocWarden 做出貢獻!Issues 與 PR 都歡迎,繁中或英文皆可。

## 開發環境

前置需求:[Ollama](https://ollama.com)、[uv](https://docs.astral.sh/uv/)、Node 22 + pnpm、Docker(選用)。

```bash
# 模型
ollama pull qwen2.5:7b && ollama pull bge-m3

# 後端
cd backend
uv sync
uv run uvicorn docwarden.server:app --port 8000 --reload

# 前端(另一個終端機)
cd frontend
pnpm install
pnpm dev
```

CLI 快速試跑(用內建範例資料集):

```bash
cd backend
uv run docwarden run --corpus ../examples/corpus --qa ../examples/qa.json --strategy hybrid
```

## 提交前檢查

```bash
cd backend && uv run ruff check src tests && uv run pytest -q
cd frontend && pnpm lint && pnpm build
```

## PR 約定

- 一個 PR 解決一件事,附上動機說明
- 新功能請附測試;修 bug 請附重現該 bug 的測試
- 指標計算的任何改動,請在 PR 說明計算定義(本專案的核心承諾是「數字可解釋」)

## 哪裡可以幫上忙

- 標 [`good first issue`](https://github.com/yusyuan9224/docwarden/issues?q=label%3A%22good+first+issue%22) 的 issue
- 新的評測指標(附透明的計算定義)
- 更多範例資料集(不同領域、不同語言)

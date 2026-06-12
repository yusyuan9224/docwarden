# DocWarden 🛡️

> **可嵌入任意網站、會誠實拒答的本地知識庫機器人**
> 查得到就附引用回答;查不到就明說 — 寧可拒答,不可編造。100% 本地(Ollama)。

[![CI](https://github.com/yusyuan9224/docwarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yusyuan9224/docwarden/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 為什麼需要 DocWarden?

社群、客服、文件站,同一個問題被問八百遍;雲端 chatbot 方案又貴、又有隱私疑慮、還會一本正經地胡說八道。DocWarden:

- 🧠 **Agentic RAG**:多步推理,自行決定查哪個知識來源、怎麼下查詢
- 🛡️ **雙層拒答防幻覺**:檢索分數門檻(硬)+ agent 拒答決策(軟)+ 無引用回答自動駁回(最後防線)
- 🔗 回答**必附來源引用**,每一步推理過程可展示
- 📋 後台「未解問題」清單 — 知道使用者問了什麼而知識庫answers不了,該補什麼文件
- 🪄 一段 `<script>` 即可嵌入任意網站
- 💸 Ollama 本地推理,零 API 費用,資料不外流

## Roadmap

- [x] v0.1 agent 核心:structured-output 決策迴圈(search/answer/refuse)+ 來源路由 + 雙層拒答
- [ ] v0.3 聊天 SSE + 管理後台 UI
- [ ] v0.6 可嵌入 widget + 未解問題清單 UI
- [ ] v1.0 Docker、demo、CI、release

## 技術備註(為什麼不用 LangGraph / tool calling)

- **Agent 用自製 while-loop**(僅 httpx):線性 RAG agent 用不到 checkpointing/time-travel,LangGraph 會強制拖入 langchain-core
- **行動決策用 structured output(JSON schema)而非 Ollama 原生 tool calling**:qwen2.5:7b 的 tool calling 有未解 bug(ollama/ollama#7445 — 會捏造工具結果),而 constrained decoding 的結構化輸出在姊妹專案 [ClauseLens](https://github.com/yusyuan9224/clauselens) 已驗證穩定
- 拒答門檻設計參考 arXiv:2411.06037(Sufficient Context)

## License

[MIT](LICENSE)

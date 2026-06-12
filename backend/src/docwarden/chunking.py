"""通用中文感知切塊:句讀累積到 chunk_size,相鄰塊帶 overlap。

RAGGauge 的切塊是「被評測的變數」,所以保持單純可解釋:
不做語義切塊,只做句子邊界 + 大小控制,讓 chunk_size 的影響可以被乾淨地量測。
"""

import re
from dataclasses import dataclass

SENTENCE_END_RE = re.compile(r"[。;!?\n]|[.!?](?=\s)")


@dataclass
class Chunk:
    id: int
    doc_id: str
    text: str


def split_sentences(text: str) -> list[str]:
    parts: list[str] = []
    start = 0
    for m in SENTENCE_END_RE.finditer(text):
        end = m.end()
        seg = text[start:end]
        if seg.strip():
            parts.append(seg)
        start = end
    if start < len(text) and text[start:].strip():
        parts.append(text[start:])
    return parts


def chunk_document(doc_id: str, text: str, chunk_size: int, overlap: int, start_id: int = 0) -> list[Chunk]:
    sentences = split_sentences(text)
    chunks: list[Chunk] = []
    buf: list[str] = []
    size = 0

    def flush() -> None:
        nonlocal buf, size
        if buf and "".join(buf).strip():
            chunks.append(Chunk(id=start_id + len(chunks), doc_id=doc_id, text="".join(buf)))
        buf, size = [], 0

    for sent in sentences:
        if size + len(sent) > chunk_size and buf:
            flush()
            # overlap:把上一塊尾端句子帶進下一塊
            tail: list[str] = []
            tail_size = 0
            for prev in reversed(chunks[-1].text and split_sentences(chunks[-1].text) or []):
                if tail_size + len(prev) > overlap:
                    break
                tail.insert(0, prev)
                tail_size += len(prev)
            buf = tail[:]
            size = tail_size
        # 單句超過 chunk_size:硬切
        while len(sent) > chunk_size:
            buf.append(sent[:chunk_size])
            flush()
            sent = sent[chunk_size:]
        buf.append(sent)
        size += len(sent)
    flush()
    return chunks

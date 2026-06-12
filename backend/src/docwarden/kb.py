"""知識庫:來源(source)→ 文件 → 切塊 → Qdrant(payload 帶 source_id)。"""

import uuid
from dataclasses import dataclass

from qdrant_client import QdrantClient
from qdrant_client import models as qm

from .chunking import chunk_document
from .config import settings
from .ollama_client import OllamaClient


@dataclass
class SearchHit:
    text: str
    score: float
    doc_name: str
    source_id: str


class KnowledgeBase:
    def __init__(self, qdrant_url: str | None = None, collection: str | None = None) -> None:
        self.client = QdrantClient(url=qdrant_url) if qdrant_url else QdrantClient(location=":memory:")
        self.collection = collection or settings.collection_name

    def ensure_collection(self) -> None:
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=qm.VectorParams(size=settings.embed_dim, distance=qm.Distance.COSINE),
            )

    async def ingest(
        self, ollama: OllamaClient, source_id: str, doc_name: str, text: str
    ) -> int:
        """文件 → 切塊 → embed → upsert;回傳 chunk 數。"""
        self.ensure_collection()
        chunks = chunk_document(doc_name, text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            return 0
        vectors = await ollama.embed([c.text for c in chunks])
        self.client.upsert(
            collection_name=self.collection,
            points=[
                qm.PointStruct(
                    id=str(uuid.uuid5(uuid.NAMESPACE_OID, f"{source_id}:{doc_name}:{c.id}")),
                    vector=v,
                    payload={
                        "source_id": source_id,
                        "doc_name": doc_name,
                        "text": c.text,
                    },
                )
                for c, v in zip(chunks, vectors, strict=True)
            ],
        )
        return len(chunks)

    async def search(
        self, ollama: OllamaClient, query: str, source_id: str | None = None, top_k: int | None = None
    ) -> list[SearchHit]:
        self.ensure_collection()
        qvec = (await ollama.embed([query]))[0]
        flt = None
        if source_id:
            flt = qm.Filter(
                must=[qm.FieldCondition(key="source_id", match=qm.MatchValue(value=source_id))]
            )
        hits = self.client.query_points(
            collection_name=self.collection,
            query=qvec,
            query_filter=flt,
            limit=top_k or settings.search_top_k,
        ).points
        return [
            SearchHit(
                text=h.payload["text"],
                score=h.score,
                doc_name=h.payload["doc_name"],
                source_id=h.payload["source_id"],
            )
            for h in hits
        ]

    def delete_source(self, source_id: str) -> None:
        if not self.client.collection_exists(self.collection):
            return
        self.client.delete(
            collection_name=self.collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(
                    must=[qm.FieldCondition(key="source_id", match=qm.MatchValue(value=source_id))]
                )
            ),
        )

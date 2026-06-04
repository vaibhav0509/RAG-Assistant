import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.config import settings


class VectorStore:
    def __init__(self):
        self._client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._embedder = SentenceTransformer(settings.embedding_model)

    def _collection(self, name: str):
        return self._client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        collection: str,
        chunks: list[str],
        filename: str,
        start_id: int = 0,
    ) -> int:
        col = self._collection(collection)
        embeddings = self._embedder.encode(chunks, show_progress_bar=False).tolist()
        ids = [f"{filename}_{start_id + i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "chunk": start_id + i} for i in range(len(chunks))]

        col.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadatas)
        return col.count()

    def query(self, collection: str, question: str, top_k: int = 5) -> list[dict]:
        col = self._collection(collection)
        if col.count() == 0:
            return []

        embedding = self._embedder.encode([question], show_progress_bar=False).tolist()
        results = col.query(query_embeddings=embedding, n_results=min(top_k, col.count()))

        sources = []
        for i, doc in enumerate(results["documents"][0]):
            sources.append({
                "content": doc,
                "source": results["metadatas"][0][i]["source"],
                "chunk": results["metadatas"][0][i]["chunk"],
                "score": round(1 - results["distances"][0][i], 4),
            })
        return sources

    def list_collections(self) -> list[dict]:
        cols = self._client.list_collections()
        return [{"name": c.name, "document_count": c.count()} for c in cols]

    def delete_collection(self, name: str) -> bool:
        try:
            self._client.delete_collection(name)
            return True
        except Exception:
            return False

    def collection_count(self, name: str) -> int:
        return self._collection(name).count()


vector_store = VectorStore()

export type StoredChunk = {
  documentId: string;
  text: string;
  embedding: number[];
};

export type StoredDocument = {
  id: string;
  fullText: string;
};

type RagStoreState = {
  documents: Map<string, StoredDocument>;
  chunks: StoredChunk[];
};

declare global {
  /** Shared across Next.js App Router bundles in one Node process (see rag-store). */
  var __ragStore: RagStoreState | undefined;
}

function getStore(): RagStoreState {
  if (!globalThis.__ragStore) {
    globalThis.__ragStore = {
      documents: new Map(),
      chunks: [],
    };
  }
  return globalThis.__ragStore;
}

export function addDocument(
  fullText: string,
  documentChunks: Array<{ text: string; embedding: number[] }>,
): string {
  const { documents, chunks } = getStore();
  const id = crypto.randomUUID();
  documents.set(id, { id, fullText });

  for (const c of documentChunks) {
    chunks.push({
      documentId: id,
      text: c.text,
      embedding: c.embedding,
    });
  }
  return id;
}

export function getChunksForRetrieval(): StoredChunk[] {
  return getStore().chunks;
}

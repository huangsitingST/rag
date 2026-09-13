export interface KnowledgeChunkRow extends Record<string, any> {
  chunk_id: string;
  document_id: string;
  version: number;
  chunk_index: number;
  is_active: boolean;
  visibility: "company" | "department";
  title: string;
  source_path: string;
  checksum: string;
  content: string;
  dense_vector: number[];
  updated_at: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  version: number;
  chunkIndex: number;
  visibility: "company" | "department";
  title: string;
  sourcePath: string;
  checksum: string;
  content: string;
  retrievalScore: number;
  rerankScore?: number;
}

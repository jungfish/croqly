-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "embedding" vector(1536);

-- CreateIndex
-- Safe to create before the backfill runs: pgvector HNSW indexes simply skip NULL entries.
CREATE INDEX "recipe_embedding_hnsw_idx" ON "Recipe" USING hnsw (embedding vector_cosine_ops);



-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "searchVector" tsvector;

-- CreateIndex
CREATE INDEX "products_searchVector_idx" ON "products" USING GIN ("searchVector");

-- Populate searchVector for existing products
UPDATE "products" SET "searchVector" = to_tsvector('english', title || ' ' || coalesce(description, ''));

CREATE TABLE "FunnelNote" (
  "id" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "key" TEXT,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FunnelNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FunnelNote_tool_kind_key_key" ON "FunnelNote"("tool", "kind", "key");
CREATE INDEX "FunnelNote_tool_kind_createdAt_idx" ON "FunnelNote"("tool", "kind", "createdAt");

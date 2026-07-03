CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'LEARNING_RESOURCE', 'SOFTWARE', 'WEBSITE', 'DOWNLOAD', 'OTHER');

ALTER TABLE "Category"
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Tag"
  ADD COLUMN "color" TEXT;

ALTER TABLE "Content"
  ADD COLUMN "contentType" "ContentType" NOT NULL DEFAULT 'ARTICLE',
  ADD COLUMN "allowFavorite" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "seoKeywords" TEXT,
  ADD COLUMN "ogTitle" TEXT,
  ADD COLUMN "ogDescription" TEXT,
  ADD COLUMN "ogImage" TEXT,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT;

CREATE TABLE "ContentResourceDetail" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "softwareName" TEXT,
  "softwareVersion" TEXT,
  "supportedSystems" TEXT,
  "fileSize" TEXT,
  "officialUrl" TEXT,
  "downloadUrl" TEXT,
  "extractionCode" TEXT,
  "installGuide" TEXT,
  "requireLoginToDownload" BOOLEAN NOT NULL DEFAULT false,
  "showDownloadCount" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentResourceDetail_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OperationLog"
  ADD COLUMN "targetTitle" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE UNIQUE INDEX "ContentResourceDetail_contentId_key" ON "ContentResourceDetail"("contentId");
CREATE INDEX "Content_contentType_idx" ON "Content"("contentType");
CREATE INDEX "Content_createdAt_idx" ON "Content"("createdAt");
CREATE INDEX "Content_updatedAt_idx" ON "Content"("updatedAt");
CREATE INDEX "Content_deletedAt_idx" ON "Content"("deletedAt");
CREATE INDEX "Content_sortOrder_idx" ON "Content"("sortOrder");

ALTER TABLE "Content"
  ADD CONSTRAINT "Content_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Content_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Content_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentResourceDetail"
  ADD CONSTRAINT "ContentResourceDetail_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'album',
    "coverPhotoId" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPhoto" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'auto',

    CONSTRAINT "CollectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "CollectionPhoto_collectionId_sortOrder_idx" ON "CollectionPhoto"("collectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CollectionPhoto_photoId_idx" ON "CollectionPhoto"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPhoto_collectionId_photoId_key" ON "CollectionPhoto"("collectionId", "photoId");

-- CreateIndex
CREATE INDEX "Photo_published_idx" ON "Photo"("published");

-- AddForeignKey
ALTER TABLE "CollectionPhoto" ADD CONSTRAINT "CollectionPhoto_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPhoto" ADD CONSTRAINT "CollectionPhoto_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

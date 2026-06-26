-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_albumId_fkey";

-- DropIndex
DROP INDEX "Photo_albumId_idx";

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "albumId";

-- DropTable
DROP TABLE "Album";

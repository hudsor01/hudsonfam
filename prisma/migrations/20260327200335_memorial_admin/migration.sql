/*
  Warnings:

  - You are about to drop the column `name` on the `Memory` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Memory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Memory` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Memory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `relationship` on table `Memory` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Memory" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "relationship" SET NOT NULL,
ALTER COLUMN "approved" SET DEFAULT false;

-- CreateTable
CREATE TABLE "MemorialMedia" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorialMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorialContent" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorialContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemorialMedia_sortOrder_idx" ON "MemorialMedia"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MemorialContent_section_key" ON "MemorialContent"("section");

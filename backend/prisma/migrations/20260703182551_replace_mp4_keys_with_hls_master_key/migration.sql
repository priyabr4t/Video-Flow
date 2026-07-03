/*
  Warnings:

  - You are about to drop the column `p1080Key` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `p360Key` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `p720Key` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "p1080Key",
DROP COLUMN "p360Key",
DROP COLUMN "p720Key",
ADD COLUMN     "hlsMasterKey" TEXT;

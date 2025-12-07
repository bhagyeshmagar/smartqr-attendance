/*
  Warnings:

  - A unique constraint covering the columns `[prn]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "academicMarks" TEXT;
ALTER TABLE "users" ADD COLUMN "currentAddress" TEXT;
ALTER TABLE "users" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "users" ADD COLUMN "gender" TEXT;
ALTER TABLE "users" ADD COLUMN "nationality" TEXT;
ALTER TABLE "users" ADD COLUMN "permanentAddress" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "prn" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_prn_key" ON "users"("prn");

-- CreateIndex
CREATE INDEX "users_prn_idx" ON "users"("prn");

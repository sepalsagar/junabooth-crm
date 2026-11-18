-- CreateEnum
CREATE TYPE "PrintSize" AS ENUM ('TWO_BY_SIX', 'FOUR_BY_SIX');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'CARPENTRY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'EMI';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "printSize" "PrintSize",
ADD COLUMN     "printsUsed" INTEGER;

-- AlterTable
ALTER TABLE "Expense" RENAME COLUMN "receiptUrl" TO "receiptPath";

-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- CreateIndex
CREATE INDEX "Expense_voidedAt_idx" ON "Expense"("voidedAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "BoothUnit" AS ENUM ('UNIT_1', 'UNIT_2');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "unit" "BoothUnit";

-- AlterTable
ALTER TABLE "CapitalEntry" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- CreateIndex
CREATE INDEX "Booking_eventDate_status_idx" ON "Booking"("eventDate", "status");

-- CreateIndex
CREATE INDEX "CapitalEntry_partnerId_idx" ON "CapitalEntry"("partnerId");

-- CreateIndex
CREATE INDEX "CapitalEntry_voidedAt_idx" ON "CapitalEntry"("voidedAt");

-- AddForeignKey
ALTER TABLE "CapitalEntry" ADD CONSTRAINT "CapitalEntry_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

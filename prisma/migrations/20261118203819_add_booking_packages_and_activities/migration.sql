-- CreateEnum
CREATE TYPE "BookingActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'PAYMENT_ADDED', 'PAYMENT_VOIDED', 'PRICE_EDITED', 'NOTE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "payOnEvent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingActivity" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "BookingActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_name_key" ON "Package"("name");

-- CreateIndex
CREATE INDEX "BookingActivity_bookingId_createdAt_idx" ON "BookingActivity"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_packageId_idx" ON "Booking"("packageId");

-- CreateIndex
CREATE INDEX "Payment_voidedAt_idx" ON "Payment"("voidedAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActivity" ADD CONSTRAINT "BookingActivity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingActivity" ADD CONSTRAINT "BookingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

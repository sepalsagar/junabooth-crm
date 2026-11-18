-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'FOLLOW_UP', 'WON', 'LOST', 'POSTPONED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM', 'META_AD', 'BNI', 'PSC', 'WEBSITE', 'REFERRAL', 'B2B_PARTNER', 'PHONE', 'TR_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('OPTION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('PAID', 'COLLAB', 'B2B');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('ADVANCE', 'PART', 'FINAL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('UPI', 'BANK', 'CASH', 'CHEQUE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('OPERATOR_FEE', 'TRANSPORT', 'FOOD', 'VENUE_CUT', 'CONSUMABLES', 'EQUIPMENT', 'SOFTWARE', 'MARKETING', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "CapitalKind" AS ENUM ('INJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "city" TEXT,
    "eventType" TEXT,
    "targetDate" TIMESTAMP(3),
    "venue" TEXT,
    "source" "LeadSource",
    "quotedAmount" INTEGER,
    "packageName" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "nextFollowUp" TIMESTAMP(3),
    "lostReason" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leadId" TEXT,
    "clientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "venue" TEXT,
    "mapLink" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "packageName" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "travelCharge" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "type" "BookingType" NOT NULL DEFAULT 'PAID',
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "dayContact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "receivedBy" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "spentOn" TIMESTAMP(3) NOT NULL,
    "paidBy" TEXT,
    "note" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalEntry" (
    "id" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "kind" "CapitalKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "PaymentMode",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_code_key" ON "Lead"("code");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_targetDate_idx" ON "Lead"("targetDate");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUp_idx" ON "Lead"("nextFollowUp");

-- CreateIndex
CREATE INDEX "Lead_eventType_idx" ON "Lead"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_leadId_key" ON "Booking"("leadId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_city_idx" ON "Booking"("city");

-- CreateIndex
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");

-- CreateIndex
CREATE INDEX "Booking_type_idx" ON "Booking"("type");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_paidOn_idx" ON "Payment"("paidOn");

-- CreateIndex
CREATE INDEX "Expense_bookingId_idx" ON "Expense"("bookingId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_spentOn_idx" ON "Expense"("spentOn");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

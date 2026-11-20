-- Preserve the financial and lead-source columns exactly as supplied by the
-- operational workbook. Existing CRM fields remain available for new entries.
ALTER TABLE "Lead" ADD COLUMN "sourceText" TEXT;
ALTER TABLE "Lead" ADD COLUMN "inquiryDate" TIMESTAMP(3);
CREATE INDEX "Lead_inquiryDate_idx" ON "Lead"("inquiryDate");

ALTER TABLE "Booking" ADD COLUMN "sheetAdvanceReceived" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "sheetBalanceDue" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "sheetFinalReceived" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "sheetPaymentStatus" TEXT;
CREATE INDEX "Booking_sheetPaymentStatus_idx" ON "Booking"("sheetPaymentStatus");

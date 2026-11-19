-- AddColumn: sourceRef (nullable, unique) on Lead, Booking, Payment, Expense, CapitalEntry
-- New model: ImportRun for audit trail of each import execution

ALTER TABLE "Lead" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "Lead_sourceRef_key" ON "Lead"("sourceRef");

ALTER TABLE "Booking" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "Booking_sourceRef_key" ON "Booking"("sourceRef");

ALTER TABLE "Payment" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "Payment_sourceRef_key" ON "Payment"("sourceRef");

ALTER TABLE "Expense" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "Expense_sourceRef_key" ON "Expense"("sourceRef");

ALTER TABLE "CapitalEntry" ADD COLUMN "sourceRef" TEXT;
CREATE UNIQUE INDEX "CapitalEntry_sourceRef_key" ON "CapitalEntry"("sourceRef");

-- ImportRun: append-only audit log of each import run
CREATE TABLE "ImportRun" (
    "id"            TEXT NOT NULL,
    "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileSha256"    TEXT NOT NULL,
    "countsJson"    JSONB NOT NULL,
    "warningsCount" INTEGER NOT NULL,
    "decisionsJson" JSONB NOT NULL,
    "targetHost"    TEXT NOT NULL,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

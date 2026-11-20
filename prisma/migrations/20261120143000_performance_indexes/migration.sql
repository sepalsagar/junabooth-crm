-- Supports the paginated filters and date-based dashboard queries without
-- changing application data or behavior.
CREATE INDEX "Lead_ownerId_status_nextFollowUp_idx" ON "Lead"("ownerId", "status", "nextFollowUp");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Booking_city_eventDate_idx" ON "Booking"("city", "eventDate");
CREATE INDEX "Booking_status_eventDate_idx" ON "Booking"("status", "eventDate");
CREATE INDEX "Expense_voidedAt_spentOn_idx" ON "Expense"("voidedAt", "spentOn");

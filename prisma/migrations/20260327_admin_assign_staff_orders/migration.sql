ALTER TABLE "Order"
ADD COLUMN "assignedStaffUserId" TEXT,
ADD COLUMN "assignedToStaffAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_assignedStaffUserId_fkey"
FOREIGN KEY ("assignedStaffUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Order_assignedStaffUserId_idx" ON "Order"("assignedStaffUserId");

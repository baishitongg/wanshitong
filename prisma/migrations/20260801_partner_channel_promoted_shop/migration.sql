ALTER TABLE "PartnerChannel" ADD COLUMN "promotedShopId" TEXT;

CREATE INDEX "PartnerChannel_promotedShopId_isActive_idx"
    ON "PartnerChannel"("promotedShopId", "isActive");

ALTER TABLE "PartnerChannel" ADD CONSTRAINT "PartnerChannel_promotedShopId_fkey"
    FOREIGN KEY ("promotedShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

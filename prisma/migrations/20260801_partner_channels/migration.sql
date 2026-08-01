CREATE TABLE "PartnerChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "shopId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerChannel_slug_key" ON "PartnerChannel"("slug");
CREATE UNIQUE INDEX "PartnerChannel_domain_key" ON "PartnerChannel"("domain");
CREATE INDEX "PartnerChannel_shopId_isActive_idx" ON "PartnerChannel"("shopId", "isActive");

ALTER TABLE "PartnerChannel" ADD CONSTRAINT "PartnerChannel_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "partnerChannelId" TEXT;

CREATE INDEX "Order_partnerChannelId_createdAt_idx" ON "Order"("partnerChannelId", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_partnerChannelId_fkey"
    FOREIGN KEY ("partnerChannelId") REFERENCES "PartnerChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

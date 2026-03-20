CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

INSERT INTO "Shop" ("id", "name", "slug", "description", "heroTitle", "heroSubtitle", "status", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'Wanshitong',
    'wanshitong',
    'Default seeded shop for migrated single-shop data.',
    'Wanshitong',
    'Multi-shop platform default storefront',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "Category" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Product" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Product" ADD COLUMN "attributes" JSONB;
ALTER TABLE "Order" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Cart" ADD COLUMN "shopId" TEXT;

UPDATE "Category"
SET "shopId" = (SELECT "id" FROM "Shop" WHERE "slug" = 'wanshitong' LIMIT 1)
WHERE "shopId" IS NULL;

UPDATE "Product"
SET "shopId" = (SELECT "id" FROM "Shop" WHERE "slug" = 'wanshitong' LIMIT 1)
WHERE "shopId" IS NULL;

UPDATE "Order"
SET "shopId" = (SELECT "id" FROM "Shop" WHERE "slug" = 'wanshitong' LIMIT 1)
WHERE "shopId" IS NULL;

UPDATE "Cart"
SET "shopId" = (SELECT "id" FROM "Shop" WHERE "slug" = 'wanshitong' LIMIT 1)
WHERE "shopId" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "shopId" SET NOT NULL;
ALTER TABLE "Cart" ALTER COLUMN "shopId" SET NOT NULL;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX "Category_shopId_name_key" ON "Category"("shopId", "name");
CREATE INDEX "Category_shopId_idx" ON "Category"("shopId");

CREATE INDEX "Product_shopId_status_idx" ON "Product"("shopId", "status");
CREATE INDEX "Product_shopId_categoryId_idx" ON "Product"("shopId", "categoryId");
CREATE INDEX "Order_shopId_status_idx" ON "Order"("shopId", "status");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Cart_shopId_idx" ON "Cart"("shopId");

ALTER TABLE "Cart" DROP CONSTRAINT IF EXISTS "Cart_userId_key";
CREATE UNIQUE INDEX "Cart_userId_shopId_key" ON "Cart"("userId", "shopId");

ALTER TABLE "Category"
ADD CONSTRAINT "Category_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Cart"
ADD CONSTRAINT "Cart_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffProfile_userId_shopId_key" ON "StaffProfile"("userId", "shopId");
CREATE INDEX "StaffProfile_shopId_isActive_idx" ON "StaffProfile"("shopId", "isActive");

ALTER TABLE "StaffProfile"
ADD CONSTRAINT "StaffProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffProfile"
ADD CONSTRAINT "StaffProfile_shopId_fkey"
FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

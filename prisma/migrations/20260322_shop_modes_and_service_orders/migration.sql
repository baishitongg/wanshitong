CREATE TYPE "ShopType" AS ENUM ('PRODUCT', 'SERVICE', 'HYBRID');
CREATE TYPE "CheckoutMode" AS ENUM ('DELIVERY', 'BOOKING', 'FLEXIBLE');
CREATE TYPE "ItemType" AS ENUM ('PHYSICAL', 'SERVICE');
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP', 'BOOKING');
CREATE TYPE "OrderFlowType" AS ENUM ('DELIVERY', 'PICKUP', 'BOOKING');
CREATE TYPE "ServiceLocationType" AS ENUM ('ONSITE', 'CUSTOMER_PLACE', 'ONLINE');

ALTER TABLE "Shop"
ADD COLUMN "shopType" "ShopType" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN "checkoutMode" "CheckoutMode" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN "themePrimary" TEXT,
ADD COLUMN "themeSecondary" TEXT,
ADD COLUMN "themeAccent" TEXT,
ADD COLUMN "themeSurface" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "homepageVariant" TEXT;

ALTER TABLE "Product"
ADD COLUMN "itemType" "ItemType" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN "requiresScheduling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "minAdvanceHours" INTEGER,
ADD COLUMN "maxAdvanceDays" INTEGER,
ADD COLUMN "requiresAddress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "requiresContact" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order"
ADD COLUMN "flowType" "OrderFlowType" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN "scheduledDate" TIMESTAMP(3),
ADD COLUMN "scheduledStartTime" TIMESTAMP(3),
ADD COLUMN "scheduledEndTime" TIMESTAMP(3),
ADD COLUMN "serviceLocationType" "ServiceLocationType",
ADD COLUMN "serviceAddressText" TEXT,
ADD COLUMN "bookingReference" TEXT;

ALTER TABLE "OrderItem"
ADD COLUMN "itemType" "ItemType",
ADD COLUMN "fulfillmentType" "FulfillmentType",
ADD COLUMN "scheduledDate" TIMESTAMP(3),
ADD COLUMN "scheduledStart" TIMESTAMP(3),
ADD COLUMN "scheduledEnd" TIMESTAMP(3);

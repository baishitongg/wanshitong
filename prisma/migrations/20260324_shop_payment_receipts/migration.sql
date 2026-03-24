ALTER TABLE "Shop"
ADD COLUMN "paymentQrImageUrl" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankAccountName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT;

CREATE TYPE "PaymentMethod" AS ENUM ('QR', 'BANK_TRANSFER');

ALTER TABLE "Order"
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "paymentReceiptUrl" TEXT,
ADD COLUMN "paymentReceiptUploadedAt" TIMESTAMP(3);

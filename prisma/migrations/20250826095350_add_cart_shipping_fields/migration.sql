-- AlterTable
ALTER TABLE "public"."Order" ALTER COLUMN "shippingName" DROP NOT NULL,
ALTER COLUMN "shippingAddr1" DROP NOT NULL,
ALTER COLUMN "shippingCity" DROP NOT NULL,
ALTER COLUMN "shippingPost" DROP NOT NULL,
ALTER COLUMN "shippingCountry" DROP NOT NULL;

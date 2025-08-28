-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

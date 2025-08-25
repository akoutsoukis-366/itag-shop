-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- Product additions
ALTER TABLE "products"
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "highlights" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "badges" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "faq" JSONB,
  ADD COLUMN "canonicalUrl" TEXT;

-- Variant additions
ALTER TABLE "variants"
  ADD COLUMN "media" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "badge" TEXT,
  ADD COLUMN "attr" JSONB;

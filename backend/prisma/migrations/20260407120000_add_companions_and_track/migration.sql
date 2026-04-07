-- AlterTable: companions count per inscription (food is charged per person)
ALTER TABLE "Inscription" ADD COLUMN "companions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: track/circuit name shown on event banners
ALTER TABLE "Event" ADD COLUMN "track" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "championshipId" TEXT;

-- CreateTable
CREATE TABLE "Championship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Championship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_championshipId_idx" ON "Event"("championshipId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

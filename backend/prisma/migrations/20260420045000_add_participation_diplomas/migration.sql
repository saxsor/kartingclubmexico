-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "diplomaFontSize" INTEGER NOT NULL DEFAULT 28,
ADD COLUMN "diplomaNameY" DOUBLE PRECISION NOT NULL DEFAULT 0.58,
ADD COLUMN "diplomaTemplateUrl" TEXT,
ADD COLUMN "diplomaTextColor" TEXT NOT NULL DEFAULT '#111111';

-- CreateTable
CREATE TABLE "ParticipationDiploma" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipationDiploma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationDiploma_eventId_pilotId_key" ON "ParticipationDiploma"("eventId", "pilotId");

-- CreateIndex
CREATE INDEX "ParticipationDiploma_eventId_idx" ON "ParticipationDiploma"("eventId");

-- CreateIndex
CREATE INDEX "ParticipationDiploma_pilotId_idx" ON "ParticipationDiploma"("pilotId");

-- CreateIndex
CREATE INDEX "ParticipationDiploma_inscriptionId_idx" ON "ParticipationDiploma"("inscriptionId");

-- AddForeignKey
ALTER TABLE "ParticipationDiploma" ADD CONSTRAINT "ParticipationDiploma_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationDiploma" ADD CONSTRAINT "ParticipationDiploma_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationDiploma" ADD CONSTRAINT "ParticipationDiploma_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

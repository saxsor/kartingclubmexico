-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "InscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'RECEIPT_SUBMITTED', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SERVICE_FEE', 'FOOD_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('FINISHED', 'DNS', 'DNF', 'DSQ');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('POSITIONS', 'POINTS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ORGANIZER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pilot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "kartNumber" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pilot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "year" INTEGER NOT NULL,
    "serviceFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "foodFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "blockCheckInOnDebt" BOOLEAN NOT NULL DEFAULT false,
    "transferInfo" TEXT,
    "posterUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "kartNumber" INTEGER,
    "status" "InscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "notes" TEXT,
    "receiptPath" TEXT,
    "selfRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "kartNumber" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedBy" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartGrid" (
    "id" TEXT NOT NULL,
    "eventCategoryId" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drawnBy" TEXT,

    CONSTRAINT "StartGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartGridPosition" (
    "id" TEXT NOT NULL,
    "startGridId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "StartGridPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "number" INTEGER NOT NULL,
    "laps" INTEGER NOT NULL DEFAULT 15,
    "status" "RaceStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "position" INTEGER,
    "lapsCompleted" INTEGER NOT NULL DEFAULT 0,
    "status" "ResultStatus" NOT NULL DEFAULT 'FINISHED',
    "basePoints" INTEGER NOT NULL DEFAULT 0,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "finalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "raceResultId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionshipStanding" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pilotId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipStanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Pilot_active_idx" ON "Pilot"("active");

-- CreateIndex
CREATE INDEX "Pilot_kartNumber_idx" ON "Pilot"("kartNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_year_idx" ON "Event"("year");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_eventId_category_key" ON "EventCategory"("eventId", "category");

-- CreateIndex
CREATE INDEX "Inscription_eventId_idx" ON "Inscription"("eventId");

-- CreateIndex
CREATE INDEX "Inscription_pilotId_idx" ON "Inscription"("pilotId");

-- CreateIndex
CREATE INDEX "Inscription_status_idx" ON "Inscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_eventId_pilotId_category_key" ON "Inscription"("eventId", "pilotId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_inscriptionId_key" ON "CheckIn"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "StartGrid_eventCategoryId_key" ON "StartGrid"("eventCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StartGridPosition_startGridId_position_key" ON "StartGridPosition"("startGridId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StartGridPosition_startGridId_inscriptionId_key" ON "StartGridPosition"("startGridId", "inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Race_eventId_category_number_key" ON "Race"("eventId", "category", "number");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_raceId_inscriptionId_key" ON "RaceResult"("raceId", "inscriptionId");

-- CreateIndex
CREATE INDEX "ChampionshipStanding_year_category_idx" ON "ChampionshipStanding"("year", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipStanding_year_pilotId_category_key" ON "ChampionshipStanding"("year", "pilotId", "category");

-- AddForeignKey
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartGrid" ADD CONSTRAINT "StartGrid_eventCategoryId_fkey" FOREIGN KEY ("eventCategoryId") REFERENCES "EventCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartGridPosition" ADD CONSTRAINT "StartGridPosition_startGridId_fkey" FOREIGN KEY ("startGridId") REFERENCES "StartGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartGridPosition" ADD CONSTRAINT "StartGridPosition_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penalty" ADD CONSTRAINT "Penalty_raceResultId_fkey" FOREIGN KEY ("raceResultId") REFERENCES "RaceResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipStanding" ADD CONSTRAINT "ChampionshipStanding_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


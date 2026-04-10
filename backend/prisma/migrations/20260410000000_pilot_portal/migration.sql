-- Add PILOT to Role enum
ALTER TYPE "Role" ADD VALUE 'PILOT';

-- Add pilotId to User
ALTER TABLE "User" ADD COLUMN "pilotId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_pilotId_key" UNIQUE ("pilotId");
ALTER TABLE "User" ADD CONSTRAINT "User_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create PilotMagicToken table
CREATE TABLE "PilotMagicToken" (
    "id" TEXT NOT NULL,
    "pilotId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotMagicToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilotMagicToken_tokenHash_key" ON "PilotMagicToken"("tokenHash");
CREATE INDEX "PilotMagicToken_tokenHash_idx" ON "PilotMagicToken"("tokenHash");
CREATE INDEX "PilotMagicToken_pilotId_idx" ON "PilotMagicToken"("pilotId");

ALTER TABLE "PilotMagicToken" ADD CONSTRAINT "PilotMagicToken_pilotId_fkey" FOREIGN KEY ("pilotId") REFERENCES "Pilot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

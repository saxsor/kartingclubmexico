import { PrismaClient } from '@prisma/client';

function buildDatabaseUrl(): string {
  const url = new URL(process.env.DATABASE_URL!);
  // Neon serverless needs tight pool settings to avoid exhaustion and idle timeouts
  const defaults: Record<string, string> = {
    connection_limit: '3',
    connect_timeout: '15',
    pool_timeout: '20',
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

import { ResultStatus } from '@prisma/client';

const F1_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
};

export function calculatePoints(position: number | null, status: ResultStatus): number {
  if (status !== 'FINISHED' || position === null) return 0;
  if (position <= 9) return F1_POINTS[position] ?? 0;
  return 1; // 10th place and beyond
}

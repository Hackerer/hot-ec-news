export function normalizeRankScore(rank: number, total = 10): number {
  const boundedRank = Math.max(1, rank);
  const boundedTotal = Math.max(total, boundedRank);
  return Number(((boundedTotal - boundedRank + 1) / boundedTotal * 100).toFixed(2));
}

export function normalizeTaobaoScore(rawScore: number, rank: number): number {
  const logScore = Math.log10(Math.max(rawScore, 1)) * 20;
  const combined = logScore * 0.7 + normalizeRankScore(rank, 10) * 0.3;
  return Number(Math.min(100, Math.max(10, combined)).toFixed(2));
}

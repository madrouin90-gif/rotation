export interface RatingAggregate {
  average: number;
  scoreOn100: number;
  votesCount: number;
}

export function computeRatingAggregate(scores: number[]): RatingAggregate | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const average = sum / scores.length;
  return {
    average,
    scoreOn100: Math.round((average / 10) * 100),
    votesCount: scores.length,
  };
}

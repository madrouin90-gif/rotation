import { describe, expect, it } from "vitest";
import { computeRatingAggregate } from "@/lib/ratings";

describe("computeRatingAggregate", () => {
  it("retourne null pour une liste vide", () => {
    expect(computeRatingAggregate([])).toBeNull();
  });

  it("calcule la moyenne, le score /100 et le nombre de votes", () => {
    const result = computeRatingAggregate([8, 10, 6]);
    expect(result).toEqual({ average: 8, scoreOn100: 80, votesCount: 3 });
  });

  it("arrondit le score /100", () => {
    const result = computeRatingAggregate([7, 8]);
    expect(result?.average).toBe(7.5);
    expect(result?.scoreOn100).toBe(75);
  });

  it("gère un seul vote", () => {
    expect(computeRatingAggregate([0])).toEqual({ average: 0, scoreOn100: 0, votesCount: 1 });
    expect(computeRatingAggregate([10])).toEqual({ average: 10, scoreOn100: 100, votesCount: 1 });
  });
});

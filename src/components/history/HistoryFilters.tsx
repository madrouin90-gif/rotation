"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { MemberWithShares } from "@/types";

interface HistoryFiltersProps {
  members: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  genres: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  from: string;
  to: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  onReset: () => void;
}

export function HistoryFilters({
  members,
  selectedMemberIds,
  onToggleMember,
  genres,
  selectedGenres,
  onToggleGenre,
  from,
  to,
  onChangeFrom,
  onChangeTo,
  onReset,
}: HistoryFiltersProps) {
  const hasFilters = selectedMemberIds.length > 0 || selectedGenres.length > 0 || from !== "" || to !== "";

  return (
    <div className="flex flex-col gap-4 bg-surface rounded-2xl p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Depuis
          <input
            type="date"
            value={from}
            onChange={(e) => onChangeFrom(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Jusqu&apos;au
          <input
            type="date"
            value={to}
            onChange={(e) => onChangeTo(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const selected = selectedMemberIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggleMember(m.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm border transition cursor-pointer ${
                selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
              }`}
            >
              <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="xs" />
              {m.pseudo}
            </button>
          );
        })}
      </div>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {genres.map((genre) => {
            const selected = selectedGenres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => onToggleGenre(genre)}
                className={`px-2.5 py-1.5 rounded-full text-sm border transition cursor-pointer ${
                  selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

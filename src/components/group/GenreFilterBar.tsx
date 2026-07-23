"use client";

interface GenreFilterBarProps {
  genres: string[];
  selectedGenres: string[];
  onToggle: (genre: string) => void;
  onReset: () => void;
}

export function GenreFilterBar({ genres, selectedGenres, onToggle, onReset }: GenreFilterBarProps) {
  if (genres.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pb-2">
      {genres.map((genre) => {
        const selected = selectedGenres.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onToggle(genre)}
            className={`px-2.5 py-1.5 rounded-full text-sm border transition cursor-pointer ${
              selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
            }`}
          >
            {genre}
          </button>
        );
      })}
      {selectedGenres.length > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted hover:text-foreground transition cursor-pointer"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

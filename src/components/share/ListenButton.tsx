interface ListenButtonProps {
  spotifyUrl: string;
  className?: string;
}

export function ListenButton({ spotifyUrl, className = "" }: ListenButtonProps) {
  return (
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Écouter sur Spotify"
      aria-label="Écouter sur Spotify"
      className={`w-9 h-9 rounded-full bg-black/50 hover:bg-accent flex items-center justify-center text-white transition cursor-pointer backdrop-blur-sm ${className}`}
    >
      <span className="text-sm translate-x-[1px]">▶</span>
    </a>
  );
}

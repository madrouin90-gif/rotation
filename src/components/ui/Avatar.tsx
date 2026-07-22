interface AvatarProps {
  emoji: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  ring?: boolean;
}

const sizeClasses = {
  xs: "w-5 h-5 text-xs",
  sm: "w-8 h-8 text-base",
  md: "w-11 h-11 text-xl",
  lg: "w-16 h-16 text-3xl",
};

export function Avatar({ emoji, color, size = "md", ring = false }: AvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center shrink-0 select-none ${
        ring ? "ring-2 ring-background" : ""
      }`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span style={{ lineHeight: 1 }}>{emoji}</span>
    </div>
  );
}

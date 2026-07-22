export const AVATAR_EMOJIS = [
  "🎸", "🎧", "🎤", "🥁", "🎹", "🎷", "🪗", "🎺",
  "🌈", "🔥", "⭐", "🌙", "🍉", "🐙", "👾", "🦋",
] as const;

export const AVATAR_COLORS = [
  "#FF5D5D", "#FF9F45", "#FFD23F", "#7ED957",
  "#3AB0FF", "#6C5CE7", "#E84393", "#00B894",
  "#FD79A8", "#A29BFE",
] as const;

export function isValidAvatarEmoji(emoji: string): boolean {
  return (AVATAR_EMOJIS as readonly string[]).includes(emoji);
}

export function isValidAvatarColor(color: string): boolean {
  return (AVATAR_COLORS as readonly string[]).includes(color);
}

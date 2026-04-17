export function truncateText(value: string | null | undefined, max: number): string {
  if (!value) return "";
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function formatRelativeTime(value: string | Date) {
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (elapsedSeconds < 60) return "agora";
  if (elapsedSeconds < 3600) return `há ${Math.floor(elapsedSeconds / 60)} min`;
  if (elapsedSeconds < 86400) return `há ${Math.floor(elapsedSeconds / 3600)}h`;
  if (elapsedSeconds < 604800) return `há ${Math.floor(elapsedSeconds / 86400)}d`;
  if (elapsedSeconds < 2592000) return `há ${Math.floor(elapsedSeconds / 604800)} sem`;
  if (elapsedSeconds < 31536000) return `há ${Math.floor(elapsedSeconds / 2592000)} mês`;
  return `há ${Math.floor(elapsedSeconds / 31536000)} ano`;
}

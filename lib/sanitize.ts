export function sanitizeTextInput(
  value: unknown,
  maxLength = 3000,
  options?: { preserveLineBreaks?: boolean }
): string {
  const source = String(value ?? "");

  const normalized = source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, options?.preserveLineBreaks ? " " : " ")
    .trim();

  return normalized.slice(0, maxLength);
}

export function sanitizeUsername(value: unknown): string {
  return sanitizeTextInput(value, 40)
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

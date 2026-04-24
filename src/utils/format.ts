export function prettyPrintUnknown(value: unknown): string {
  if (value == null) return ""

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return ""
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return trimmed
    }
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

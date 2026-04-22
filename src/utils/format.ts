export function prettyPrintUnknown(value: unknown): string {
  if (value == null) return ""

  if (typeof value === "string") {
    const s = value.trim()
    if (!s) return ""
    try {
      const parsed = JSON.parse(s)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return prettyFormatLooseStructuredText(s)
    }
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function prettyFormatLooseStructuredText(input: string): string {
  const s = input.trim()
  if (!s) return ""

  let out = ""
  let indent = 0
  let quote: "'" | '"' | null = null
  let escape = false
  let justNewlined = false

  const pushIndentIfNeeded = () => {
    if (justNewlined) {
      out += "  ".repeat(Math.max(0, indent))
      justNewlined = false
    }
  }

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]

    if (escape) {
      pushIndentIfNeeded()
      out += ch
      escape = false
      continue
    }

    if (quote) {
      pushIndentIfNeeded()
      out += ch
      if (ch === "\\") {
        escape = true
      } else if (ch === quote) {
        quote = null
      }
      continue
    }

    if (ch === "'" || ch === '"') {
      pushIndentIfNeeded()
      out += ch
      quote = ch as "'" | '"'
      continue
    }

    if (ch === "{" || ch === "[") {
      pushIndentIfNeeded()
      out += ch
      indent += 1
      out += "\n"
      justNewlined = true
      continue
    }

    if (ch === "}" || ch === "]") {
      indent = Math.max(0, indent - 1)
      out = out.replace(/[ \t]+$/g, "")
      if (!out.endsWith("\n")) {
        out += "\n"
      }
      justNewlined = true
      pushIndentIfNeeded()
      out += ch
      continue
    }

    if (ch === ",") {
      pushIndentIfNeeded()
      out += ch
      out += "\n"
      justNewlined = true
      continue
    }

    if (ch === "\n" || ch === "\r" || ch === "\t") {
      continue
    }

    if (ch === " ") {
      if (!justNewlined && out.length > 0 && !out.endsWith(" ") && !out.endsWith("\n")) {
        out += " "
      }
      continue
    }

    pushIndentIfNeeded()
    out += ch
  }

  return out.replace(/\n{3,}/g, "\n\n").trim()
}


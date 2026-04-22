import { describe, expect, it } from "vitest"
import { prettyFormatLooseStructuredText, prettyPrintUnknown } from "@/utils/format"

describe("format", () => {
  it("prettyPrintUnknown pretty-prints JSON string", () => {
    const s = '{"a":1,"b":[2,3]}'
    expect(prettyPrintUnknown(s)).toContain("\n")
    expect(prettyPrintUnknown(s)).toContain('"a": 1')
  })

  it("prettyFormatLooseStructuredText formats python-like dict", () => {
    const s = "{'a': 1, 'b': {'c': 2}}"
    const out = prettyFormatLooseStructuredText(s)
    expect(out).toContain("\n")
    expect(out).toContain("'a':")
    expect(out).toContain("'b':")
  })
})


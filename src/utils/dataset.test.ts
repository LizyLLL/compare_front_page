import { describe, expect, it } from "vitest"
import { parseDatasetFromJson } from "@/utils/dataset"

const record = {
  sample_id: "2",
  query: "Q?",
  user_status: { a: 1 },
  extra_info: { user_profile: "P" },
  model_outputs: {
    gpt_4o: [
      { role: "assistant", content: "" },
      { role: "assistant", content: "final_gpt" },
    ],
    skillrl: [{ role: "assistant", content: "final_skill" }],
    our_method: [{ role: "assistant", content: "final_our" }],
    claude_sonnet_4_6: [{ role: "assistant", content: "final_claude" }],
  },
}

describe("parseDatasetFromJson", () => {
  it("parses single record", () => {
    const ds = parseDatasetFromJson(record, "x.json")
    expect(ds.items).toHaveLength(1)
    expect(ds.items[0].sampleId).toBe("2")
    expect(ds.items[0].question).toBe("Q?")
    expect(ds.items[0].answers.gpt_4o).toBe("final_gpt")
    expect(ds.items[0].answers.skillrl).toBe("final_skill")
  })

  it("parses array", () => {
    const ds = parseDatasetFromJson([record, record], "x.json")
    expect(ds.items).toHaveLength(2)
  })

  it("parses items wrapper", () => {
    const ds = parseDatasetFromJson({ dataset_name: "d", items: [record] }, "x.json")
    expect(ds.datasetName).toBe("d")
    expect(ds.items).toHaveLength(1)
  })
})

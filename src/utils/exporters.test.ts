import { describe, expect, it } from "vitest"
import { exportBundleToCsvText, exportBundleToJsonText, toExportBundle, type RatedItem } from "@/utils/exporters"
import type { EvalDataset } from "@/utils/dataset"

describe("exporters", () => {
  it("exports json", () => {
    const ds: EvalDataset = {
      datasetId: "d1",
      datasetName: "d",
      sourceName: "s",
      items: [
        {
          id: "i1",
          sampleId: "sid-1",
          question: "q",
          userStatus: { x: 1 },
          userProfile: null,
          answers: {
            gpt_4o: "a",
            skillrl: "b",
            our_method: "c",
            claude_sonnet_4_6: "d",
          },
        },
      ],
    }

    const ratedItems: RatedItem[] = [
      {
        itemId: "i1",
        sampleId: "sid-1",
        question: "q",
        userStatus: { x: 1 },
        blindMapping: { A: "gpt_4o", B: "skillrl", C: "our_method", D: "claude_sonnet_4_6" } as const,
        ratings: {
          A: { scores: { q_relevance: 5, user_relevance: 4, readability: 3 }, note: "" },
          B: { scores: { q_relevance: 1, user_relevance: 2, readability: 3 }, note: "n" },
          C: { scores: { q_relevance: 3, user_relevance: 3, readability: 3 }, note: "" },
          D: { scores: { q_relevance: 2, user_relevance: 2, readability: 2 }, note: "" },
        },
        itemNote: "i",
      },
    ]

    const bundle = toExportBundle(ds, ratedItems)
    const json = exportBundleToJsonText(bundle)
    expect(json).toContain('"datasetId": "d1"')
    expect(json).toContain('"items"')
  })

  it("exports csv with 4 rows", () => {
    const ds: EvalDataset = {
      datasetId: "d1",
      items: [
        {
          id: "i1",
          sampleId: "2",
          question: "q",
          userStatus: "u",
          userProfile: null,
          answers: { gpt_4o: "a", skillrl: "b", our_method: "c", claude_sonnet_4_6: "d" },
        },
      ],
    }

    const ratedItems: RatedItem[] = [
      {
        itemId: "i1",
        sampleId: "2",
        question: "q",
        userStatus: "u",
        blindMapping: { A: "gpt_4o", B: "skillrl", C: "our_method", D: "claude_sonnet_4_6" } as const,
        ratings: {
          A: { scores: { q_relevance: 5, user_relevance: 5, readability: 5 }, note: "" },
          B: { scores: { q_relevance: 4, user_relevance: 4, readability: 4 }, note: "" },
          C: { scores: { q_relevance: 3, user_relevance: 3, readability: 3 }, note: "" },
          D: { scores: { q_relevance: 2, user_relevance: 2, readability: 2 }, note: "" },
        },
        itemNote: "",
      },
    ]
    const bundle = toExportBundle(ds, ratedItems)
    const csv = exportBundleToCsvText(bundle)
    const lines = csv.trim().split("\n")
    expect(lines.length).toBe(1 + 4)
    expect(csv).toContain("blind_label")
    expect(csv).toContain("sample_id")
    expect(csv).toContain("q_relevance")
  })
})

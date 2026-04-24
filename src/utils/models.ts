export type ModelKey = "gpt_4o" | "skillrl" | "our_method" | "claude_sonnet_4_6"

export const MODEL_KEYS: ModelKey[] = [
  "skillrl",
  "our_method",
  "gpt_4o",
  "claude_sonnet_4_6",
]

export const MODEL_LABELS: Record<ModelKey, string> = {
  gpt_4o: "gpt-4o",
  skillrl: "skillrl",
  our_method: "our method",
  claude_sonnet_4_6: "claude sonnet 4.6",
}

export type BlindLabel = "A" | "B" | "C" | "D"

export const BLIND_LABELS: BlindLabel[] = ["A", "B", "C", "D"]

export type DimensionKey = "q_relevance" | "user_relevance" | "readability"
export type Score = 1 | 2 | 3 | 4 | 5

export const DIMENSIONS: Array<{ key: DimensionKey; label: string; hint: string }> = [
  { key: "q_relevance", label: "回答与问题的相关性", hint: "是否解决了问题" },
  { key: "user_relevance", label: "回答和用户的相关性", hint: "个性化程度" },
  { key: "readability", label: "回答的可读性", hint: "阅读起来是否舒服" },
]

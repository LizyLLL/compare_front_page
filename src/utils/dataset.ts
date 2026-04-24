import { MODEL_KEYS, type ModelKey } from "@/utils/models"

export type EvalItem = {
  id: string
  sampleId?: string
  question: string
  questionZh?: string
  userStatus: unknown
  userStatusZh?: unknown
  userProfile: unknown
  userProfileZh?: unknown
  answers: Record<ModelKey, string>
  answersZh: Partial<Record<ModelKey, string>>
}

export type EvalDataset = {
  datasetId: string
  datasetName?: string
  sourceName?: string
  items: EvalItem[]
  hasTranslations: boolean
}

type RawRecord = Record<string, unknown>
type RawMessage = { role?: string; content?: unknown }

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) h = (h * 33) ^ input.charCodeAt(i)
  return (h >>> 0).toString(16)
}

function extractLastAssistantText(messages: unknown): string {
  if (!Array.isArray(messages)) return ""
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as RawMessage
    if (msg?.role !== "assistant") continue
    if (typeof msg.content !== "string") continue
    const trimmed = msg.content.trim()
    if (trimmed) return trimmed
  }
  return ""
}

function coerceQuestion(record: RawRecord): string {
  if (typeof record.problem === "string" && record.problem.trim()) return record.problem.trim()
  if (typeof record.query === "string" && record.query.trim()) return record.query.trim()
  const extra = asObject(record.extra_info)
  if (extra && typeof extra.user_query === "string" && extra.user_query.trim()) return extra.user_query.trim()
  return ""
}

function coerceUserStatus(record: RawRecord): unknown {
  if (record.user_status != null) return record.user_status
  const extra = asObject(record.extra_info)
  if (extra?.user_status != null) return extra.user_status
  return null
}

function coerceUserProfile(record: RawRecord): unknown {
  if (record.user_profile != null) return record.user_profile
  const extra = asObject(record.extra_info)
  if (extra?.user_profile != null) return extra.user_profile
  return null
}

function coerceSampleId(record: RawRecord, fallbackIndex: number): string {
  const v = record.sample_id
  if (typeof v === "string" && v.trim()) return v.trim()
  if (typeof v === "number") return String(v)
  return String(fallbackIndex + 1)
}

function parseOneRecord(record: RawRecord, fallbackIndex: number): EvalItem {
  const modelOutputs = asObject(record.model_outputs) || {}
  const answers = {} as Record<ModelKey, string>
  const answersZh: Partial<Record<ModelKey, string>> = {}
  const translatedAnswers = asObject(record.final_answers_zh) || {}

  for (const key of MODEL_KEYS) {
    answers[key] = extractLastAssistantText(modelOutputs[key])
    if (typeof translatedAnswers[key] === "string" && translatedAnswers[key]) {
      answersZh[key] = translatedAnswers[key] as string
    }
  }

  const sampleId = coerceSampleId(record, fallbackIndex)
  const id =
    (typeof record.id === "string" && record.id.trim()) ||
    (typeof record.index === "string" && record.index) ||
    (typeof record.index === "number" ? String(record.index) : "") ||
    sampleId

  return {
    id,
    sampleId,
    question: coerceQuestion(record),
    questionZh: typeof record.query_zh === "string" ? record.query_zh : undefined,
    userStatus: coerceUserStatus(record),
    userStatusZh: record.user_status_zh,
    userProfile: coerceUserProfile(record),
    userProfileZh: record.user_profile_zh,
    answers,
    answersZh,
  }
}

export function parseDatasetFromJson(raw: unknown, sourceName?: string): EvalDataset {
  let records: RawRecord[] = []
  let datasetName: string | undefined

  if (Array.isArray(raw)) {
    records = raw as RawRecord[]
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.items)) {
      records = obj.items as RawRecord[]
      if (typeof obj.dataset_name === "string") datasetName = obj.dataset_name
      if (typeof obj.datasetName === "string") datasetName = obj.datasetName
    } else {
      records = [obj as RawRecord]
    }
  }

  const items = records.map((record, index) => parseOneRecord(record, index))
  const hasTranslations = items.some(
    (item) => Boolean(item.questionZh || item.userStatusZh || item.userProfileZh || Object.keys(item.answersZh).length)
  )

  return {
    datasetId: hashString(JSON.stringify(items.map((item) => [item.sampleId, item.question]))),
    datasetName,
    sourceName,
    items,
    hasTranslations,
  }
}

import { z } from "zod"
import { MODEL_KEYS, type ModelKey } from "@/utils/models"

const MessageSchema = z.object({
  role: z.string(),
  content: z.unknown().optional(),
})

const ModelOutputsSchema = z.record(z.string(), z.array(MessageSchema))

const AnyRecordSchema = z.object({
  id: z.unknown().optional(),
  sample_id: z.unknown().optional(),
  index: z.unknown().optional(),
  query: z.unknown().optional(),
  problem: z.unknown().optional(),
  timestamp: z.unknown().optional(),
  user_name: z.unknown().optional(),
  user_status: z.unknown().optional(),
  extra_info: z.unknown().optional(),
  model_outputs: z.unknown().optional(),
})

type AnyRecord = z.infer<typeof AnyRecordSchema>

export type EvalItem = {
  id: string
  sampleId?: string
  question: string
  userStatus: unknown
  userProfile: unknown
  answers: Record<ModelKey, string>
}

export type EvalDataset = {
  datasetId: string
  datasetName?: string
  sourceName?: string
  items: EvalItem[]
}

function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 33) ^ input.charCodeAt(i)
  }
  return (h >>> 0).toString(16).padStart(8, "0")
}

function extractLastAssistantText(messages: Array<{ role?: string; content?: unknown }>): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    if (m.role !== "assistant") continue
    const c = typeof m.content === "string" ? m.content.trim() : ""
    if (c) return c
  }
  return ""
}

function asObj(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null
  return v as Record<string, unknown>
}

function coerceQuestion(record: AnyRecord): string {
  const q1 = typeof record.problem === "string" ? record.problem : undefined
  const q2 = typeof record.query === "string" ? record.query : undefined
  const ei = asObj(record.extra_info)
  const q3 = ei && typeof ei["user_query"] === "string" ? (ei["user_query"] as string) : undefined
  return (q1 || q2 || q3 || "").trim()
}

function coerceUserStatus(record: AnyRecord): unknown {
  if (record.user_status != null) return record.user_status
  const ei = asObj(record.extra_info)
  if (ei && ei["user_status"] != null) return ei["user_status"]
  return null
}

function coerceUserProfile(record: AnyRecord): unknown {
  const ei = asObj(record.extra_info)
  if (ei && ei["user_profile"] != null) return ei["user_profile"]
  return null
}

function coerceId(record: AnyRecord, fallbackIndex: number): string {
  if (typeof record.id === "string" && record.id.trim()) return record.id.trim()
  const index = typeof record.index === "number" || typeof record.index === "string" ? String(record.index) : String(fallbackIndex)
  const ts = typeof record.timestamp === "string" ? record.timestamp : ""
  const user = typeof record.user_name === "string" ? record.user_name : ""
  const base = [user, ts, index].filter(Boolean).join("_")
  return base || `item_${fallbackIndex}`
}

function coerceSampleId(record: AnyRecord): string | undefined {
  const v = record.sample_id
  if (typeof v === "string") {
    const s = v.trim()
    return s ? s : undefined
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return undefined
}

function parseOneRecord(input: unknown, fallbackIndex: number): EvalItem {
  const record = AnyRecordSchema.parse(input)

  const modelOutputsRaw = record.model_outputs
  const modelOutputs = ModelOutputsSchema.parse(modelOutputsRaw)

  const answers = MODEL_KEYS.reduce((acc, k) => {
    const msgs = modelOutputs[k] || []
    acc[k] = extractLastAssistantText(msgs)
    return acc
  }, {} as Record<ModelKey, string>)

  return {
    id: coerceId(record, fallbackIndex),
    sampleId: coerceSampleId(record),
    question: coerceQuestion(record),
    userStatus: coerceUserStatus(record),
    userProfile: coerceUserProfile(record),
    answers,
  }
}

export function parseDatasetFromJson(raw: unknown, sourceName?: string): EvalDataset {
  let datasetName: string | undefined
  let records: unknown[]

  if (Array.isArray(raw)) {
    records = raw
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o["items"])) {
      records = o["items"] as unknown[]
      if (typeof o["dataset_name"] === "string") datasetName = o["dataset_name"]
      if (typeof o["datasetName"] === "string") datasetName = o["datasetName"]
    } else {
      records = [raw]
    }
  } else {
    records = [raw]
  }

  const items = records.map((r, i) => parseOneRecord(r, i))
  const datasetId = hashString(JSON.stringify(items.map((it) => [it.id, it.question])))

  return {
    datasetId,
    datasetName,
    sourceName,
    items,
  }
}

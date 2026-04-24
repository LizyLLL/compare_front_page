import { BLIND_LABELS, DIMENSIONS, type BlindLabel, type DimensionKey, type ModelKey, type Score } from "@/utils/models"
import type { EvalDataset } from "@/utils/dataset"

export type RatedAnswer = {
  scores: Partial<Record<DimensionKey, Score>>
  note: string
}

export type RatedItem = {
  itemId: string
  sampleId?: string
  blindMapping: Record<BlindLabel, ModelKey>
  question: string
  userStatus: unknown
  ratings: Record<BlindLabel, RatedAnswer>
  itemNote: string
}

export type ExportBundle = {
  datasetId: string
  datasetName?: string
  sourceName?: string
  exportedAt: string
  items: RatedItem[]
}

export function toExportBundle(dataset: EvalDataset, items: RatedItem[]): ExportBundle {
  return {
    datasetId: dataset.datasetId,
    datasetName: dataset.datasetName,
    sourceName: dataset.sourceName,
    exportedAt: new Date().toISOString(),
    items,
  }
}

export function exportBundleToJsonText(bundle: ExportBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

export function exportBundleToCsvText(bundle: ExportBundle): string {
  const headers = [
    "dataset_id",
    "dataset_name",
    "source_name",
    "exported_at",
    "item_id",
    "sample_id",
    "blind_label",
    "model_key",
    "question",
    "user_status",
    ...DIMENSIONS.map((d) => d.key),
    "answer_note",
    "item_note",
  ]

  const lines = [headers.join(",")]
  for (const item of bundle.items) {
    for (const label of BLIND_LABELS) {
      const rating = item.ratings[label]
      const row = [
        bundle.datasetId,
        bundle.datasetName || "",
        bundle.sourceName || "",
        bundle.exportedAt,
        item.itemId,
        item.sampleId || "",
        label,
        item.blindMapping[label],
        item.question,
        typeof item.userStatus === "string" ? item.userStatus : JSON.stringify(item.userStatus),
        ...DIMENSIONS.map((d) => rating.scores[d.key] ?? ""),
        rating.note,
        item.itemNote,
      ]
      lines.push(row.map(escapeCsv).join(","))
    }
  }
  return `${lines.join("\n")}\n`
}

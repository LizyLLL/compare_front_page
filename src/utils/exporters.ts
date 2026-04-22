import Papa from "papaparse"
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

export function toExportBundle(dataset: EvalDataset, ratedItems: RatedItem[]): ExportBundle {
  return {
    datasetId: dataset.datasetId,
    datasetName: dataset.datasetName,
    sourceName: dataset.sourceName,
    exportedAt: new Date().toISOString(),
    items: ratedItems,
  }
}

export function exportBundleToJsonText(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2) + "\n"
}

export function exportBundleToCsvText(bundle: ExportBundle): string {
  const rows: Array<Record<string, unknown>> = []
  for (const it of bundle.items) {
    for (const label of BLIND_LABELS) {
      const r = it.ratings[label]
      const row: Record<string, unknown> = {
        dataset_id: bundle.datasetId,
        dataset_name: bundle.datasetName || "",
        source_name: bundle.sourceName || "",
        exported_at: bundle.exportedAt,
        item_id: it.itemId,
        sample_id: it.sampleId ?? "",
        blind_label: label,
        model_key: it.blindMapping[label],
        question: it.question,
        user_status: typeof it.userStatus === "string" ? it.userStatus : JSON.stringify(it.userStatus),
        answer_note: r.note,
        item_note: it.itemNote,
      }
      for (const d of DIMENSIONS) {
        row[d.key] = r.scores[d.key] ?? ""
      }
      rows.push(row)
    }
  }

  return Papa.unparse(rows, { newline: "\n" }) + "\n"
}
